"use server";

import {
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
  StockMovementType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  addPdvCartItem,
  clearPdvCart,
  getPdvCartItems,
  removePdvCartItem,
  updatePdvCartItem,
  type PdvCartItem,
} from "@/lib/pdv-cart";
import { createOrderCode } from "@/lib/orders/order-code";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const pdvProductSelect = {
  id: true,
  sku: true,
  name: true,
  unit: true,
  retailPriceCents: true,
  stockCurrent: true,
  status: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

type PdvProduct = Prisma.ProductGetPayload<{
  select: typeof pdvProductSelect;
}>;

type PdvOrderItemSnapshot = {
  productId: string;
  sku: string;
  name: string;
  unit: string | null;
  quantity: number;
  unitPriceCents: number;
  originalUnitPriceCents: number;
  lineTotalCents: number;
  overrideReason: string | null;
};

const cartItemSchema = z.object({
  productId: z.string().min(1, "Produto inválido."),
  quantity: z.coerce
    .number()
    .int("Quantidade inválida.")
    .min(1, "A quantidade precisa ser maior que zero.")
    .max(999, "Quantidade muito alta."),
  overrideUnitPrice: z.string().optional(),
  overrideReason: z.string().optional(),
});

const finalizePdvSaleSchema = z.object({
  paymentMethod: z.enum(["PIX", "CASH"]),
  customerName: z.string().optional(),
  notes: z.string().optional(),
});

function getString(formData: FormData, field: string): string {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized || null;
}

function redirectToPdvMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/admin/pdv?${params.toString()}`);
}

function parseCurrencyToCents(value: string): number | null {
  const normalized = value.trim().replaceAll(/[R$\s]/g, "");

  if (!normalized) {
    return null;
  }

  const canonicalValue = normalized.includes(",")
    ? normalized.replaceAll(".", "").replace(",", ".")
    : normalized;

  const amount = Number(canonicalValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Preço informado inválido.");
  }

  return Math.round(amount * 100);
}

function formatCurrencyFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

async function getPdvProduct(productId: string): Promise<PdvProduct | null> {
  return prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: pdvProductSelect,
  });
}

function assertProductCanBeSoldInPdv(
  product: PdvProduct | null,
): asserts product is PdvProduct {
  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  if (!product.isActive || product.status === ProductStatus.INACTIVE) {
    throw new Error(`Produto indisponível: ${product.name}.`);
  }

  if (
    product.stockCurrent <= 0 ||
    product.status === ProductStatus.OUT_OF_STOCK
  ) {
    throw new Error(`Produto sem estoque: ${product.name}.`);
  }
}

function buildCartItemFromFormData(input: {
  formData: FormData;
  product: PdvProduct;
}): PdvCartItem {
  const parsed = cartItemSchema.safeParse({
    productId: getString(input.formData, "productId"),
    quantity: getString(input.formData, "quantity"),
    overrideUnitPrice: getString(input.formData, "overrideUnitPrice"),
    overrideReason: getString(input.formData, "overrideReason"),
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Dados do item inválidos.",
    );
  }

  const overrideUnitPriceCents = parseCurrencyToCents(
    parsed.data.overrideUnitPrice ?? "",
  );

  const unitPriceCents =
    overrideUnitPriceCents ?? input.product.retailPriceCents;

  const overrideReason = normalizeOptional(parsed.data.overrideReason);

  if (
    unitPriceCents !== input.product.retailPriceCents &&
    overrideReason === null
  ) {
    throw new Error("Informe o motivo para alterar o preço no PDV.");
  }

  const quantity = Math.min(parsed.data.quantity, input.product.stockCurrent);

  return {
    productId: input.product.id,
    quantity,
    unitPriceCents,
    overrideReason,
  };
}

async function buildPdvOrderItems(
  tx: Prisma.TransactionClient,
  cartItems: PdvCartItem[],
): Promise<PdvOrderItemSnapshot[]> {
  const orderItems: PdvOrderItemSnapshot[] = [];

  for (const cartItem of cartItems) {
    const product = await tx.product.findUnique({
      where: {
        id: cartItem.productId,
      },
      select: pdvProductSelect,
    });

    assertProductCanBeSoldInPdv(product);

    if (product.stockCurrent < cartItem.quantity) {
      throw new Error(
        `Estoque insuficiente para ${product.name}. Disponível: ${product.stockCurrent}.`,
      );
    }

    if (
      cartItem.unitPriceCents !== product.retailPriceCents &&
      !cartItem.overrideReason
    ) {
      throw new Error(
        `Informe o motivo da alteração de preço para ${product.name}.`,
      );
    }

    orderItems.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity: cartItem.quantity,
      unitPriceCents: cartItem.unitPriceCents,
      originalUnitPriceCents: product.retailPriceCents,
      lineTotalCents: cartItem.unitPriceCents * cartItem.quantity,
      overrideReason: cartItem.overrideReason,
    });
  }

  return orderItems;
}

function calculatePdvSubtotal(orderItems: PdvOrderItemSnapshot[]): number {
  return orderItems.reduce((total, item) => total + item.lineTotalCents, 0);
}

async function createPdvOrderWithUniqueCode(input: {
  tx: Prisma.TransactionClient;
  userId: string;
  orderItems: PdvOrderItemSnapshot[];
  paymentMethod: PaymentMethod;
  customerName: string | null;
  notes: string | null;
  subtotalCents: number;
}) {
  const {
    tx,
    userId,
    orderItems,
    paymentMethod,
    customerName,
    notes,
    subtotalCents,
  } = input;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = createOrderCode();
    const existingOrder = await tx.order.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existingOrder) continue;

    const now = new Date();
    const orderNotes = [
      customerName
        ? `Consumidor: ${customerName}`
        : "Consumidor não informado.",
      notes,
    ]
      .filter(Boolean)
      .join("\n\n");

    return tx.order.create({
      data: {
        code,
        source: OrderSource.PDV,
        createdByUserId: userId,
        status: OrderStatus.PAID_CONFIRMED,
        subtotalCents,
        discountCentsApplied: 0,
        totalDueCents: subtotalCents,
        additionalDueCents: 0,
        paidAt: now,
        notes: orderNotes,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
            wholesaleApplied:
              item.unitPriceCents !== item.originalUnitPriceCents,
          })),
        },
        payments: {
          create: {
            method: paymentMethod,
            status: PaymentStatus.CONFIRMED,
            receivedAmountCents: subtotalCents,
            differenceCents: 0,
            notes,
            confirmedByUserId: userId,
            confirmedAt: now,
          },
        },
      },
      select: {
        id: true,
        code: true,
      },
    });
  }

  throw new Error("Não foi possível gerar um código único para a venda PDV.");
}

async function decreaseStockForPdvSale(input: {
  tx: Prisma.TransactionClient;
  orderItems: PdvOrderItemSnapshot[];
  orderId: string;
  orderCode: string;
  userId: string;
}): Promise<void> {
  for (const item of input.orderItems) {
    const updatedProduct = await input.tx.product.updateMany({
      where: {
        id: item.productId,
        isActive: true,
        status: {
          not: ProductStatus.INACTIVE,
        },
        stockCurrent: {
          gte: item.quantity,
        },
      },
      data: {
        stockCurrent: {
          decrement: item.quantity,
        },
      },
    });

    if (updatedProduct.count !== 1) {
      throw new Error(
        `Não foi possível baixar estoque para ${item.name}. Revise o PDV.`,
      );
    }

    const productAfterSale = await input.tx.product.findUnique({
      where: {
        id: item.productId,
      },
      select: {
        stockCurrent: true,
      },
    });

    if (!productAfterSale) {
      throw new Error(`Produto não encontrado após venda: ${item.name}.`);
    }

    const previousStock = productAfterSale.stockCurrent + item.quantity;

    if (productAfterSale.stockCurrent <= 0) {
      await input.tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          status: ProductStatus.OUT_OF_STOCK,
        },
      });
    }

    await input.tx.stockMovement.create({
      data: {
        productId: item.productId,
        orderId: input.orderId,
        userId: input.userId,
        type: StockMovementType.PDV_SALE,
        quantity: -item.quantity,
        previousStock,
        newStock: productAfterSale.stockCurrent,
        reason: `Venda PDV ${input.orderCode}`,
        metadata: {
          orderCode: input.orderCode,
          source: "pdv",
          unitPriceCents: item.unitPriceCents,
          originalUnitPriceCents: item.originalUnitPriceCents,
          overrideReason: item.overrideReason,
        },
      },
    });
  }
}

async function createPdvAuditLog(input: {
  tx: Prisma.TransactionClient;
  userId: string;
  orderId: string;
  orderCode: string;
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  orderItems: PdvOrderItemSnapshot[];
}): Promise<void> {
  await input.tx.auditLog.create({
    data: {
      userId: input.userId,
      action: "pdv.create_paid_order",
      entity: "Order",
      entityId: input.orderId,
      payload: {
        orderCode: input.orderCode,
        source: OrderSource.PDV,
        paymentMethod: input.paymentMethod,
        subtotalCents: input.subtotalCents,
        itemsCount: input.orderItems.length,
        overrides: input.orderItems
          .filter((item) => item.unitPriceCents !== item.originalUnitPriceCents)
          .map((item) => ({
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            originalUnitPriceCents: item.originalUnitPriceCents,
            unitPriceCents: item.unitPriceCents,
            overrideReason: item.overrideReason,
          })),
      },
    },
  });
}

export async function addPdvCartItemAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.PDV_CREATE_ORDER);

  try {
    const productId = getString(formData, "productId");
    const product = await getPdvProduct(productId);
    assertProductCanBeSoldInPdv(product);

    const cartItem = buildCartItemFromFormData({
      formData,
      product,
    });

    await addPdvCartItem(cartItem);

    revalidatePath("/admin/pdv");

    redirectToPdvMessage({
      type: "sucesso",
      message: "Produto adicionado ao carrinho PDV.",
    });
  } catch (error) {
    redirectToPdvMessage({
      type: "erro",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o produto ao PDV.",
    });
  }
}

export async function updatePdvCartItemAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.PDV_CREATE_ORDER);

  try {
    const productId = getString(formData, "productId");
    const product = await getPdvProduct(productId);
    assertProductCanBeSoldInPdv(product);

    const cartItem = buildCartItemFromFormData({
      formData,
      product,
    });

    await updatePdvCartItem(cartItem);

    revalidatePath("/admin/pdv");

    redirectToPdvMessage({
      type: "sucesso",
      message: "Item do carrinho PDV atualizado.",
    });
  } catch (error) {
    redirectToPdvMessage({
      type: "erro",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o item do PDV.",
    });
  }
}

export async function removePdvCartItemAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.PDV_CREATE_ORDER);

  const productId = getString(formData, "productId");

  if (productId) {
    await removePdvCartItem(productId);
  }

  revalidatePath("/admin/pdv");

  redirectToPdvMessage({
    type: "sucesso",
    message: "Item removido do carrinho PDV.",
  });
}

export async function clearPdvCartAction(): Promise<void> {
  await requirePermission(PERMISSIONS.PDV_CREATE_ORDER);

  await clearPdvCart();

  revalidatePath("/admin/pdv");

  redirectToPdvMessage({
    type: "sucesso",
    message: "Carrinho PDV limpo.",
  });
}

export async function finalizePdvSaleAction(formData: FormData): Promise<void> {
  const auth = await requirePermission(PERMISSIONS.PDV_CREATE_ORDER);

  try {
    const parsed = finalizePdvSaleSchema.safeParse({
      paymentMethod: getString(formData, "paymentMethod"),
      customerName: getString(formData, "customerName"),
      notes: getString(formData, "notes"),
    });

    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message ?? "Dados de pagamento inválidos.",
      );
    }

    const cartItems = await getPdvCartItems();

    if (cartItems.length === 0) {
      throw new Error("O carrinho PDV está vazio.");
    }

    const paymentMethod =
      parsed.data.paymentMethod === "PIX"
        ? PaymentMethod.PIX
        : PaymentMethod.CASH;

    const orderCode = await prisma.$transaction(async (tx) => {
      const orderItems = await buildPdvOrderItems(tx, cartItems);
      const subtotalCents = calculatePdvSubtotal(orderItems);

      if (subtotalCents <= 0) {
        throw new Error("Total da venda PDV inválido.");
      }

      const order = await createPdvOrderWithUniqueCode({
        tx,
        userId: auth.user.id,
        orderItems,
        paymentMethod,
        customerName: normalizeOptional(parsed.data.customerName),
        notes: normalizeOptional(parsed.data.notes),
        subtotalCents,
      });

      await decreaseStockForPdvSale({
        tx,
        orderItems,
        orderId: order.id,
        orderCode: order.code,
        userId: auth.user.id,
      });

      await createPdvAuditLog({
        tx,
        userId: auth.user.id,
        orderId: order.id,
        orderCode: order.code,
        paymentMethod,
        subtotalCents,
        orderItems,
      });

      return order.code;
    });

    await clearPdvCart();

    revalidatePath("/admin/pdv");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/estoque");
    revalidatePath("/admin/produtos");
    revalidatePath("/admin/relatorios");

    redirectToPdvMessage({
      type: "sucesso",
      message: `Venda PDV ${orderCode} finalizada em ${formatCurrencyFromCents(
        cartItems.reduce(
          (total, item) => total + item.unitPriceCents * item.quantity,
          0,
        ),
      )}.`,
    });
  } catch (error) {
    redirectToPdvMessage({
      type: "erro",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar a venda PDV.",
    });
  }
}
