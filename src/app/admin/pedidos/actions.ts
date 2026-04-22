"use server";

import { revalidatePath } from "next/cache";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  type Prisma,
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

const confirmableOrderStatuses = new Set<OrderStatus>([
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PENDING_COMPLEMENT,
]);

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

export async function confirmPixPaymentAction(formData: FormData) {
  const auth = await requirePermission(PERMISSIONS.PAYMENTS_CONFIRM_PIX);

  const rawNotes = formData.get("notes");

  const parsed = confirmPixPaymentSchema.safeParse({
    orderId: formData.get("orderId"),
    receivedAmount: formData.get("receivedAmount"),
    notes: typeof rawNotes === "string" ? rawNotes : undefined,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Dados de pagamento inválidos.",
    );
  }

  const receivedAmountCents = parseCurrencyToCents(parsed.data.receivedAmount);
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

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
}
