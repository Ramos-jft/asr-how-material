"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  getTemporaryPurchaseRemainingForStatus,
  type CustomerPolicyStatus,
} from "@/domain/customer-policy";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const customerActionSchema = z.object({
  customerId: z.string().min(1, "Cliente inválido."),
});

const customerStatusSuccessMessages = {
  APPROVED: "Cliente aprovado com sucesso.",
  TEMPORARY: "Cliente liberado como temporário com sucesso.",
  BLOCKED: "Cliente bloqueado com sucesso.",
  PENDING: "Cliente marcado como pendente com sucesso.",
} satisfies Record<CustomerPolicyStatus, string>;

function redirectToCustomersMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/admin/clientes?${params.toString()}`);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function updateCustomerStatus(
  formData: FormData,
  status: CustomerPolicyStatus,
): Promise<void> {
  const auth = await requirePermission(PERMISSIONS.CUSTOMERS_APPROVE);

  const parsed = customerActionSchema.safeParse({
    customerId: formData.get("customerId"),
  });

  if (!parsed.success) {
    redirectToCustomersMessage({
      type: "erro",
      message: parsed.error.issues[0]?.message ?? "Cliente inválido.",
    });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: {
        id: parsed.data.customerId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    if (!customer) {
      throw new Error("Cliente não encontrado.");
    }

    const temporaryPurchaseRemaining =
      getTemporaryPurchaseRemainingForStatus(status);

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        status,
        temporaryPurchaseRemaining,
        approvedAt:
          status === "APPROVED" || status === "TEMPORARY" ? new Date() : null,
        approvedByUserId:
          status === "APPROVED" || status === "TEMPORARY" ? auth.user.id : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: `customer.${status.toLowerCase()}`,
        entity: "Customer",
        entityId: customer.id,
        payload: {
          name: customer.name,
          email: customer.email,
          previousStatus: customer.status,
          nextStatus: status,
          temporaryPurchaseRemaining,
        },
      },
    });
  } catch (error) {
    redirectToCustomersMessage({
      type: "erro",
      message: getErrorMessage(
        error,
        "Não foi possível atualizar o status do cliente.",
      ),
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clientes");

  redirectToCustomersMessage({
    type: "sucesso",
    message: customerStatusSuccessMessages[status],
  });
}

export async function approveCustomerAction(formData: FormData): Promise<void> {
  await updateCustomerStatus(formData, "APPROVED");
}

export async function makeCustomerTemporaryAction(
  formData: FormData,
): Promise<void> {
  await updateCustomerStatus(formData, "TEMPORARY");
}

export async function blockCustomerAction(formData: FormData): Promise<void> {
  await updateCustomerStatus(formData, "BLOCKED");
}
