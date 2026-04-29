"use server";

import { ProductStatus, StockMovementType, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Produto inválido."),
  movementType: z.enum(["ENTRY", "ADJUSTMENT"], {
    message: "Tipo de movimentação inválido.",
  }),
  quantity: z.coerce
    .number()
    .int("Informe um número inteiro.")
    .min(0, "A quantidade não pode ser negativa."),
  reason: z
    .string()
    .trim()
    .min(5, "Informe um motivo com pelo menos 5 caracteres."),
});

function getString(formData: FormData, field: string): string {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function redirectToStockMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/admin/estoque?${params.toString()}`);
}

function getNextStock(input: {
  movementType: "ENTRY" | "ADJUSTMENT";
  previousStock: number;
  quantity: number;
}): number {
  if (input.movementType === "ENTRY") {
    return input.previousStock + input.quantity;
  }

  return input.quantity;
}

function getMovementQuantity(input: {
  movementType: "ENTRY" | "ADJUSTMENT";
  previousStock: number;
  nextStock: number;
  quantity: number;
}): number {
  if (input.movementType === "ENTRY") {
    return input.quantity;
  }

  return input.nextStock - input.previousStock;
}

function getNextProductStatus(input: {
  currentStatus: ProductStatus;
  isActive: boolean;
  nextStock: number;
}): ProductStatus {
  if (input.currentStatus === ProductStatus.INACTIVE) {
    return ProductStatus.INACTIVE;
  }

  if (input.nextStock <= 0) {
    return ProductStatus.OUT_OF_STOCK;
  }

  if (input.isActive) {
    return ProductStatus.ACTIVE;
  }

  return input.currentStatus;
}

async function createStockAuditLog(input: {
  tx: Prisma.TransactionClient;
  userId: string;
  productId: string;
  productSku: string;
  productName: string;
  movementType: StockMovementType;
  previousStock: number;
  nextStock: number;
  movementQuantity: number;
  reason: string;
}): Promise<void> {
  await input.tx.auditLog.create({
    data: {
      userId: input.userId,
      action: "stock.manual_adjustment",
      entity: "Product",
      entityId: input.productId,
      payload: {
        sku: input.productSku,
        name: input.productName,
        movementType: input.movementType,
        previousStock: input.previousStock,
        nextStock: input.nextStock,
        movementQuantity: input.movementQuantity,
        reason: input.reason,
      },
    },
  });
}

export async function adjustStockAction(formData: FormData): Promise<void> {
  const auth = await requirePermission(PERMISSIONS.STOCK_ADJUST);

  const parsed = stockAdjustmentSchema.safeParse({
    productId: getString(formData, "productId"),
    movementType: getString(formData, "movementType"),
    quantity: getString(formData, "quantity"),
    reason: getString(formData, "reason"),
  });

  if (!parsed.success) {
    redirectToStockMessage({
      type: "erro",
      message:
        parsed.error.issues[0]?.message ??
        "Revise os dados do ajuste de estoque.",
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: parsed.data.productId,
        },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
          isActive: true,
          stockCurrent: true,
        },
      });

      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      const movementType =
        parsed.data.movementType === "ENTRY"
          ? StockMovementType.ENTRY
          : StockMovementType.ADJUSTMENT;

      const nextStock = getNextStock({
        movementType: parsed.data.movementType,
        previousStock: product.stockCurrent,
        quantity: parsed.data.quantity,
      });

      const movementQuantity = getMovementQuantity({
        movementType: parsed.data.movementType,
        previousStock: product.stockCurrent,
        nextStock,
        quantity: parsed.data.quantity,
      });

      if (movementQuantity === 0) {
        throw new Error("O ajuste não alterou o estoque do produto.");
      }

      const nextStatus = getNextProductStatus({
        currentStatus: product.status,
        isActive: product.isActive,
        nextStock,
      });

      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          stockCurrent: nextStock,
          status: nextStatus,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          userId: auth.user.id,
          type: movementType,
          quantity: movementQuantity,
          previousStock: product.stockCurrent,
          newStock: nextStock,
          reason: parsed.data.reason,
          metadata: {
            source: "admin_stock_adjustment",
            sku: product.sku,
            name: product.name,
            movementMode: parsed.data.movementType,
          },
        },
      });

      await createStockAuditLog({
        tx,
        userId: auth.user.id,
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        movementType,
        previousStock: product.stockCurrent,
        nextStock,
        movementQuantity,
        reason: parsed.data.reason,
      });
    });
  } catch (error) {
    redirectToStockMessage({
      type: "erro",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível ajustar o estoque.",
    });
  }

  revalidatePath("/admin/estoque");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/pdv");
  revalidatePath("/catalogo");
  revalidatePath("/sitemap.xml");

  redirectToStockMessage({
    type: "sucesso",
    message: "Estoque ajustado com sucesso.",
  });
}
