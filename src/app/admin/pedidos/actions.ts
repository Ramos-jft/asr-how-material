"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
  StockMovementType,
} from "@prisma/client";
import { z } from "zod";

import { resolvePaymentConfirmation } from "@/domain/order-payment";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const confirmPixPaymentSchema = z.object({
  orderId: z.string().min(1, "Pedido inválido."),
  receivedAmount: z.string().min(1, "Informe o valor recebido."),
  notes: z.string().optional(),
});

const cancelOrderSchema = z.object({
  orderId: z.string().min(1, "Pedido inválido."),
  reason: z.string().trim().optional(),
});

const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Pedido inválido."),
  nextStatus: z.enum(["SHIPPED", "COMPLETED"], {
    message: "Status de destino inválido.",
  }),
  notes: z.string().trim().optional(),
});

const confirmableOrderStatuses = new Set<OrderStatus>([
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PENDING_COMPLEMENT,
]);

const cancellableOrderStatuses = new Set<OrderStatus>([
  OrderStatus.AWAITING_PAYMENT,
]);

function redirectToOrdersMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/admin/pedidos?${params.toString()}`);
}

function parseCurrencyToCents(value: string): number {
  const normalized = value.trim().replaceAll(/[R$\s]/g, "");

  if (!normalized) {
    throw new Error("Informe o valor recebido.");
  }

  const canonicalValue = normalized.includes(",")
    ? normalized.replaceAll(".", "").replace(",", ".")
    : normalized;

  const amount = Number(canonicalValue);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor recebido inválido.");
  }

  return Math.round(amount * 100);
}

function getPaymentOrderStatus(status: string): OrderStatus {
  if (status === "PAID_CONFIRMED") {
    return OrderStatus.PAID_CONFIRMED;
  }

  return OrderStatus.PENDING_COMPLEMENT;
}

function sumConfirmedPayments(
  payments: ReadonlyArray<{ receivedAmountCents: number }>,
): number {
  return payments.reduce(
    (total, payment) => total + payment.receivedAmountCents,
    0,
  );
}

function buildCancellationNotes(input: {
  currentNotes: string | null;
  reason: string | null;
  userName: string;
  date: Date;
}): string {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(input.date);

  const cancellationNote = [
    `Pedido cancelado manualmente por ${input.userName} em ${formattedDate}.`,
    input.reason ? `Motivo: ${input.reason}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [input.currentNotes, cancellationNote].filter(Boolean).join("\n\n");
}

function buildStatusUpdateNotes(input: {
  currentNotes: string | null;
  nextStatus: OrderStatus;
  notes: string | null;
  userName: string;
  date: Date;
}): string {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(input.date);

  const statusText =
    input.nextStatus === OrderStatus.SHIPPED
      ? "marcado como enviado"
      : "marcado como concluído";

  const statusNote = [
    `Pedido ${statusText} por ${input.userName} em ${formattedDate}.`,
    input.notes ? `Observação: ${input.notes}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [input.currentNotes, statusNote].filter(Boolean).join("\n\n");
}

function assertValidOrderStatusTransition(input: {
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  source: OrderSource;
}): void {
  if (
    input.nextStatus === OrderStatus.SHIPPED &&
    input.currentStatus === OrderStatus.PAID_CONFIRMED
  ) {
    return;
  }

  if (
    input.nextStatus === OrderStatus.COMPLETED &&
    input.currentStatus === OrderStatus.SHIPPED
  ) {
    return;
  }

  if (
    input.nextStatus === OrderStatus.COMPLETED &&
    input.currentStatus === OrderStatus.PAID_CONFIRMED &&
    input.source === OrderSource.PDV
  ) {
    return;
  }

  throw new Error("Transição de status não permitida para este pedido.");
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function revalidateOrdersViews(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/relatorios");
  revalidatePath("/pedidos");
}

export async function confirmPixPaymentAction(
  formData: FormData,
): Promise<void> {
  const auth = await requirePermission(PERMISSIONS.PAYMENTS_CONFIRM_PIX);

  const rawNotes = formData.get("notes");

  const parsed = confirmPixPaymentSchema.safeParse({
    orderId: formData.get("orderId"),
    receivedAmount: formData.get("receivedAmount"),
    notes: typeof rawNotes === "string" ? rawNotes : undefined,
  });

  if (!parsed.success) {
    redirectToOrdersMessage({
      type: "erro",
      message:
        parsed.error.issues[0]?.message ?? "Dados de pagamento inválidos.",
    });
  }

  try {
    const receivedAmountCents = parseCurrencyToCents(
      parsed.data.receivedAmount,
    );
    const notes = parsed.data.notes?.trim() || null;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: {
          id: parsed.data.orderId,
        },
        include: {
          payments: {
            where: {
              status: PaymentStatus.CONFIRMED,
            },
            select: {
              receivedAmountCents: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Pedido não encontrado.");
      }

      if (!confirmableOrderStatuses.has(order.status)) {
        throw new Error(
          "Somente pedidos aguardando pagamento ou pendentes de complemento podem receber confirmação de PIX.",
        );
      }

      const previouslyReceivedCents = sumConfirmedPayments(order.payments);

      const resolution = resolvePaymentConfirmation({
        totalDueCents: order.totalDueCents,
        receivedAmountCents,
        previouslyReceivedCents,
      });

      const now = new Date();
      const nextStatus = getPaymentOrderStatus(resolution.nextStatus);

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: PaymentMethod.PIX,
          status: PaymentStatus.CONFIRMED,
          receivedAmountCents,
          differenceCents: resolution.additionalDueCents,
          notes,
          confirmedByUserId: auth.user.id,
          confirmedAt: now,
        },
      });

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: nextStatus,
          additionalDueCents: resolution.additionalDueCents,
          paidAt: resolution.isFullyPaid ? now : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          action: "payment.confirm_pix",
          entity: "Order",
          entityId: order.id,
          payload: {
            orderCode: order.code,
            previousStatus: order.status,
            nextStatus,
            receivedAmountCents,
            previouslyReceivedCents,
            totalReceivedCents: resolution.totalReceivedCents,
            totalDueCents: order.totalDueCents,
            additionalDueCents: resolution.additionalDueCents,
          },
        },
      });
    });
  } catch (error) {
    redirectToOrdersMessage({
      type: "erro",
      message: getErrorMessage(
        error,
        "Não foi possível confirmar o pagamento PIX.",
      ),
    });
  }

  revalidateOrdersViews();

  redirectToOrdersMessage({
    type: "sucesso",
    message: "Pagamento PIX confirmado com sucesso.",
  });
}

export async function cancelOrderAndReleaseStockAction(
  formData: FormData,
): Promise<void> {
  const auth = await requirePermission(PERMISSIONS.ORDERS_CANCEL_RELEASE);

  const parsed = cancelOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirectToOrdersMessage({
      type: "erro",
      message:
        parsed.error.issues[0]?.message ?? "Dados de cancelamento inválidos.",
    });
  }

  const reason = parsed.data.reason?.trim() || null;
  const now = new Date();

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: {
          id: parsed.data.orderId,
        },
        include: {
          items: {
            select: {
              id: true,
              productId: true,
              name: true,
              quantity: true,
            },
          },
          payments: {
            where: {
              status: PaymentStatus.CONFIRMED,
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Pedido não encontrado.");
      }

      if (!cancellableOrderStatuses.has(order.status)) {
        throw new Error(
          "Somente pedidos aguardando pagamento podem ser cancelados com liberação automática de estoque.",
        );
      }

      if (order.payments.length > 0) {
        throw new Error(
          "Este pedido possui pagamento confirmado. Resolva manualmente antes de cancelar.",
        );
      }

      for (const item of order.items) {
        if (!item.productId) {
          continue;
        }

        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
          select: {
            id: true,
            stockCurrent: true,
            status: true,
            isActive: true,
          },
        });

        if (!product) {
          continue;
        }

        const previousStock = product.stockCurrent;
        const newStock = previousStock + item.quantity;

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            stockCurrent: {
              increment: item.quantity,
            },
            status:
              product.isActive && product.status === ProductStatus.OUT_OF_STOCK
                ? ProductStatus.ACTIVE
                : product.status,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            orderId: order.id,
            userId: auth.user.id,
            type: StockMovementType.CANCEL_RELEASE,
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: `Liberação de estoque por cancelamento do pedido ${order.code}`,
            metadata: {
              orderCode: order.code,
              orderItemId: item.id,
              productName: item.name,
              source: "admin_order_cancel",
            },
          },
        });
      }

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: now,
          notes: buildCancellationNotes({
            currentNotes: order.notes,
            reason,
            userName: auth.user.name,
            date: now,
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          action: "order.cancel_release_stock",
          entity: "Order",
          entityId: order.id,
          payload: {
            orderCode: order.code,
            previousStatus: order.status,
            nextStatus: OrderStatus.CANCELLED,
            reason,
            releasedItems: order.items.map((item) => ({
              orderItemId: item.id,
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
            })),
          },
        },
      });
    });
  } catch (error) {
    redirectToOrdersMessage({
      type: "erro",
      message: getErrorMessage(
        error,
        "Não foi possível cancelar o pedido e liberar estoque.",
      ),
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/relatorios");
  revalidatePath("/pedidos");

  redirectToOrdersMessage({
    type: "sucesso",
    message: "Pedido cancelado e estoque liberado com sucesso.",
  });
}

export async function updateOrderStatusAction(
  formData: FormData,
): Promise<void> {
  const auth = await requirePermission(PERMISSIONS.ORDERS_UPDATE_STATUS);

  const parsed = updateOrderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    nextStatus: formData.get("nextStatus"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirectToOrdersMessage({
      type: "erro",
      message: parsed.error.issues[0]?.message ?? "Dados de status inválidos.",
    });
  }

  const nextStatus =
    parsed.data.nextStatus === "SHIPPED"
      ? OrderStatus.SHIPPED
      : OrderStatus.COMPLETED;

  const notes = parsed.data.notes?.trim() || null;
  const now = new Date();

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: {
          id: parsed.data.orderId,
        },
        select: {
          id: true,
          code: true,
          source: true,
          status: true,
          notes: true,
        },
      });

      if (!order) {
        throw new Error("Pedido não encontrado.");
      }

      assertValidOrderStatusTransition({
        currentStatus: order.status,
        nextStatus,
        source: order.source,
      });

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: nextStatus,
          notes: buildStatusUpdateNotes({
            currentNotes: order.notes,
            nextStatus,
            notes,
            userName: auth.user.name,
            date: now,
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          action: "order.update_status",
          entity: "Order",
          entityId: order.id,
          payload: {
            orderCode: order.code,
            source: order.source,
            previousStatus: order.status,
            nextStatus,
            notes,
          },
        },
      });
    });
  } catch (error) {
    redirectToOrdersMessage({
      type: "erro",
      message: getErrorMessage(
        error,
        "Não foi possível atualizar o status do pedido.",
      ),
    });
  }

  revalidateOrdersViews();

  redirectToOrdersMessage({
    type: "sucesso",
    message: "Status do pedido atualizado com sucesso.",
  });
}
