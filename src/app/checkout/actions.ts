"use server";

import {
  CustomerStatus,
  OrderSource,
  OrderStatus,
  Prisma,
  ProductStatus,
  StockMovementType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ORDER_MINIMUM_CENTS,
  calculateOrderPricing,
} from "@/domain/order-pricing";
import { requireAuth } from "@/lib/auth/guards";
import { clearCart, getCartItems, type CartItem } from "@/lib/cart";
import { createOrderCode } from "@/lib/orders/order-code";
import { prisma } from "@/lib/prisma";
import { getActiveStoreWindow } from "@/lib/store-window";

const checkoutProductSelect = {
  id: true,
  sku: true,
  name: true,
  unit: true,
  retailPriceCents: true,
  stockCurrent: true,
  status: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

type CheckoutProduct = Prisma.ProductGetPayload<{
  select: typeof checkoutProductSelect;
}>;

type CheckoutCustomer = Prisma.CustomerGetPayload<{
  include: {
    address: true;
  };
}>;

type CheckoutCustomerWithAddress = CheckoutCustomer & {
  address: NonNullable<CheckoutCustomer["address"]>;
};

type NormalizedCartItem = {
  productId: string;
  quantity: number;
};

type OrderItemSnapshot = {
  productId: string;
  sku: string;
  name: string;
  unit: string | null;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type ShippingAddressInput = {
  zipCode: string;
  state: string;
  city: string;
  district: string;
  street: string;
  number: string;
  complement: string | null;
  reference: string | null;
};

function normalizeCartItems(items: CartItem[]): NormalizedCartItem[] {
  const groupedItems = new Map<string, number>();

  for (const item of items) {
    const currentQuantity = groupedItems.get(item.productId) ?? 0;
    groupedItems.set(item.productId, currentQuantity + item.quantity);
  }

  return Array.from(groupedItems.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function getCheckoutErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Não foi possível criar o pedido. Revise o carrinho e tente novamente.";
}

function redirectToCheckoutError(error: unknown): never {
  const message = encodeURIComponent(getCheckoutErrorMessage(error));
  redirect(`/checkout?erro=${message}`);
}

function assertCartHasItems(items: NormalizedCartItem[]): void {
  if (items.length === 0) {
    throw new Error("Seu carrinho está vazio.");
  }
}

function isCustomerAllowedToBuy(input: {
  status: CustomerStatus;
  temporaryPurchaseRemaining: number;
}): boolean {
  if (input.status === CustomerStatus.APPROVED) return true;

  return (
    input.status === CustomerStatus.TEMPORARY &&
    input.temporaryPurchaseRemaining > 0
  );
}

function assertCustomerCanCheckout(
  customer: CheckoutCustomer | null,
): asserts customer is CheckoutCustomerWithAddress {
  if (!customer) {
    throw new Error("Cadastro de cliente não encontrado para este usuário.");
  }

  if (
    !isCustomerAllowedToBuy({
      status: customer.status,
      temporaryPurchaseRemaining: customer.temporaryPurchaseRemaining,
    })
  ) {
    throw new Error(
      "Seu cadastro ainda não está aprovado para finalizar compras.",
    );
  }

  if (!customer.address) {
    throw new Error("Endereço do cliente não encontrado.");
  }
}

function assertProductCanBeOrdered(
  product: CheckoutProduct | null,
  quantity: number,
): asserts product is CheckoutProduct {
  if (!product) {
    throw new Error("Um dos produtos do carrinho não foi encontrado.");
  }

  if (!product.isActive || product.status === ProductStatus.INACTIVE) {
    throw new Error(`Produto indisponível: ${product.name}.`);
  }

  if (product.stockCurrent <= 0) {
    throw new Error(`Produto esgotado: ${product.name}.`);
  }

  if (product.stockCurrent < quantity) {
    throw new Error(
      `Estoque insuficiente para ${product.name}. Disponível: ${product.stockCurrent}.`,
    );
  }
}

function buildShippingAddressJson(
  address: ShippingAddressInput,
): Prisma.InputJsonObject {
  return {
    zipCode: address.zipCode,
    state: address.state,
    city: address.city,
    district: address.district,
    street: address.street,
    number: address.number,
    complement: address.complement,
    reference: address.reference,
  };
}

function formatMinimumOrderMessage(): string {
  const minimum = (ORDER_MINIMUM_CENTS / 100).toFixed(2).replace(".", ",");

  return `Pedido mínimo não atingido. O mínimo é de R$ ${minimum}.`;
}

function calculatePricingOrThrow(orderItems: OrderItemSnapshot[]) {
  const subtotalCents = orderItems.reduce(
    (total, item) => total + item.lineTotalCents,
    0,
  );

  const pricing = calculateOrderPricing(subtotalCents);

  if (!pricing.isMinimumReached) {
    throw new Error(formatMinimumOrderMessage());
  }

  return pricing;
}

async function getCheckoutCustomer(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<CheckoutCustomer | null> {
  return tx.customer.findUnique({
    where: {
      userId,
    },
    include: {
      address: true,
    },
  });
}

async function getCheckoutProduct(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<CheckoutProduct | null> {
  return tx.product.findUnique({
    where: {
      id: productId,
    },
    select: checkoutProductSelect,
  });
}

async function buildOrderItemSnapshot(
  tx: Prisma.TransactionClient,
  cartItem: NormalizedCartItem,
): Promise<OrderItemSnapshot> {
  const product = await getCheckoutProduct(tx, cartItem.productId);

  assertProductCanBeOrdered(product, cartItem.quantity);

  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    quantity: cartItem.quantity,
    unitPriceCents: product.retailPriceCents,
    lineTotalCents: product.retailPriceCents * cartItem.quantity,
  };
}

async function buildOrderItemSnapshots(
  tx: Prisma.TransactionClient,
  cartItems: NormalizedCartItem[],
): Promise<OrderItemSnapshot[]> {
  const orderItems: OrderItemSnapshot[] = [];

  for (const cartItem of cartItems) {
    orderItems.push(await buildOrderItemSnapshot(tx, cartItem));
  }

  return orderItems;
}

async function createOrderWithUniqueCode(input: {
  tx: Prisma.TransactionClient;
  customerId: string;
  userId: string;
  shippingAddressJson: Prisma.InputJsonObject;
  orderItems: OrderItemSnapshot[];
  subtotalCents: number;
  discountCentsApplied: number;
  totalDueCents: number;
  discountExpiresAt: Date | null;
  storeWindowId: string;
}) {
  const {
    tx,
    customerId,
    userId,
    shippingAddressJson,
    orderItems,
    subtotalCents,
    discountCentsApplied,
    totalDueCents,
    discountExpiresAt,
    storeWindowId,
  } = input;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = createOrderCode();
    const existingOrder = await tx.order.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existingOrder) continue;

    return tx.order.create({
      data: {
        code,
        source: OrderSource.ONLINE,
        customerId,
        createdByUserId: userId,
        status: OrderStatus.AWAITING_PAYMENT,
        subtotalCents,
        discountCentsApplied,
        totalDueCents,
        additionalDueCents: 0,
        discountExpiresAt,
        storeWindowId,
        shippingAddressJson,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
            wholesaleApplied: false,
          })),
        },
      },
      select: {
        id: true,
        code: true,
      },
    });
  }

  throw new Error("Não foi possível gerar um código único para o pedido.");
}

async function reserveSingleOrderItem(input: {
  tx: Prisma.TransactionClient;
  item: OrderItemSnapshot;
  orderId: string;
  orderCode: string;
  userId: string;
}): Promise<void> {
  const { tx, item, orderId, orderCode, userId } = input;

  const updatedProduct = await tx.product.updateMany({
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
      `Não foi possível reservar estoque para ${item.name}. Revise o carrinho.`,
    );
  }

  const productAfterReservation = await tx.product.findUnique({
    where: {
      id: item.productId,
    },
    select: {
      stockCurrent: true,
    },
  });

  if (!productAfterReservation) {
    throw new Error(`Produto não encontrado após reserva: ${item.name}.`);
  }

  const previousStock = productAfterReservation.stockCurrent + item.quantity;

  if (productAfterReservation.stockCurrent <= 0) {
    await tx.product.update({
      where: {
        id: item.productId,
      },
      data: {
        status: ProductStatus.OUT_OF_STOCK,
      },
    });
  }

  await tx.stockMovement.create({
    data: {
      productId: item.productId,
      orderId,
      userId,
      type: StockMovementType.RESERVE,
      quantity: -item.quantity,
      previousStock,
      newStock: productAfterReservation.stockCurrent,
      reason: `Reserva automática do pedido ${orderCode}`,
      metadata: {
        orderCode,
        source: "checkout",
      },
    },
  });
}

async function reserveOrderStock(input: {
  tx: Prisma.TransactionClient;
  orderItems: OrderItemSnapshot[];
  orderId: string;
  orderCode: string;
  userId: string;
}): Promise<void> {
  for (const item of input.orderItems) {
    await reserveSingleOrderItem({
      tx: input.tx,
      item,
      orderId: input.orderId,
      orderCode: input.orderCode,
      userId: input.userId,
    });
  }
}

async function decrementTemporaryPurchaseRemaining(input: {
  tx: Prisma.TransactionClient;
  customer: CheckoutCustomer;
}): Promise<void> {
  if (input.customer.status !== CustomerStatus.TEMPORARY) return;

  await input.tx.customer.update({
    where: {
      id: input.customer.id,
    },
    data: {
      temporaryPurchaseRemaining: {
        decrement: 1,
      },
    },
  });
}

async function createCheckoutAuditLog(input: {
  tx: Prisma.TransactionClient;
  userId: string;
  orderId: string;
  orderCode: string;
  subtotalCents: number;
  discountCentsApplied: number;
  totalDueCents: number;
  itemsCount: number;
}): Promise<void> {
  await input.tx.auditLog.create({
    data: {
      userId: input.userId,
      action: "order.create",
      entity: "Order",
      entityId: input.orderId,
      payload: {
        orderCode: input.orderCode,
        source: OrderSource.ONLINE,
        subtotalCents: input.subtotalCents,
        discountCentsApplied: input.discountCentsApplied,
        totalDueCents: input.totalDueCents,
        itemsCount: input.itemsCount,
      },
    },
  });
}

async function createCheckoutOrder(input: {
  tx: Prisma.TransactionClient;
  userId: string;
  cartItems: NormalizedCartItem[];
}): Promise<string> {
  const customer = await getCheckoutCustomer(input.tx, input.userId);
  assertCustomerCanCheckout(customer);

  const activeStoreWindow = await getActiveStoreWindow();

  if (!activeStoreWindow) {
    throw new Error(
      "A loja está fora do período de vendas. O checkout está bloqueado no momento.",
    );
  }

  const orderItems = await buildOrderItemSnapshots(input.tx, input.cartItems);
  const pricing = calculatePricingOrThrow(orderItems);

  const order = await createOrderWithUniqueCode({
    storeWindowId: activeStoreWindow.id,
    tx: input.tx,
    customerId: customer.id,
    userId: input.userId,
    shippingAddressJson: buildShippingAddressJson(customer.address),
    orderItems,
    subtotalCents: pricing.subtotalCents,
    discountCentsApplied: pricing.discountCentsApplied,
    totalDueCents: pricing.totalDueCents,
    discountExpiresAt: pricing.discountExpiresAt,
  });

  await reserveOrderStock({
    tx: input.tx,
    orderItems,
    orderId: order.id,
    orderCode: order.code,
    userId: input.userId,
  });

  await decrementTemporaryPurchaseRemaining({
    tx: input.tx,
    customer,
  });

  await createCheckoutAuditLog({
    tx: input.tx,
    userId: input.userId,
    orderId: order.id,
    orderCode: order.code,
    subtotalCents: pricing.subtotalCents,
    discountCentsApplied: pricing.discountCentsApplied,
    totalDueCents: pricing.totalDueCents,
    itemsCount: orderItems.length,
  });

  return order.code;
}

export async function createOrderAction() {
  const auth = await requireAuth();
  const cartItems = normalizeCartItems(await getCartItems());

  assertCartHasItems(cartItems);

  let orderCode: string | null = null;

  try {
    orderCode = await prisma.$transaction((tx) =>
      createCheckoutOrder({
        tx,
        userId: auth.user.id,
        cartItems,
      }),
    );
  } catch (error) {
    redirectToCheckoutError(error);
  }

  if (!orderCode) {
    redirectToCheckoutError(
      new Error("Pedido criado sem código de pagamento válido."),
    );
  }

  await clearCart();

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
  revalidatePath(`/pagamento/${orderCode}`);

  redirect(`/pagamento/${orderCode}`);
}
