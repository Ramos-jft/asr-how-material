"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getTemporaryPurchaseRemainingForStatus,
  type CustomerPolicyStatus,
} from "@/domain/customer-policy";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const customerActionSchema = z.object({
  customerId: z.string().min(1, "Cliente inválido."),
});

async function updateCustomerStatus(
  formData: FormData,
  status: CustomerPolicyStatus,
) {
  const auth = await requirePermission(PERMISSIONS.CUSTOMERS_APPROVE);

  const parsed = customerActionSchema.safeParse({
    customerId: formData.get("customerId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Cliente inválido.");
  }

  const temporaryPurchaseRemaining =
    getTemporaryPurchaseRemainingForStatus(status);

  await prisma.customer.update({
    where: {
      id: parsed.data.customerId,
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
      entityId: parsed.data.customerId,
      payload: {
        status,
        temporaryPurchaseRemaining,
      },
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/clientes");
}

export async function approveCustomerAction(formData: FormData) {
  await updateCustomerStatus(formData, "APPROVED");
}

export async function makeCustomerTemporaryAction(formData: FormData) {
  await updateCustomerStatus(formData, "TEMPORARY");
}

export async function blockCustomerAction(formData: FormData) {
  await updateCustomerStatus(formData, "BLOCKED");
}
