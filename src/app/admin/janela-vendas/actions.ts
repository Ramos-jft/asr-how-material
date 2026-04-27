"use server";

import { StoreWindowStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, field: string): string {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptional(value: string): string | null {
  return value.trim() || null;
}

function redirectWithMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/admin/janela-vendas?${params.toString()}`);
}

function parseDateTimeLocal(value: string): Date | null {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

const storeWindowSchema = z.object({
  startsAt: z.string().min(1, "Informe o início da janela."),
  endsAt: z.string().min(1, "Informe o fim da janela."),
  message: z.string().optional(),
});

export async function createStoreWindowAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.STORE_WINDOW_MANAGE);

  const parsed = storeWindowSchema.safeParse({
    startsAt: getString(formData, "startsAt"),
    endsAt: getString(formData, "endsAt"),
    message: getString(formData, "message"),
  });

  if (!parsed.success) {
    redirectWithMessage({
      type: "erro",
      message:
        parsed.error.issues[0]?.message ??
        "Revise os dados da janela de vendas.",
    });
  }

  const startsAt = parseDateTimeLocal(parsed.data.startsAt);
  const endsAt = parseDateTimeLocal(parsed.data.endsAt);

  if (!startsAt || !endsAt) {
    redirectWithMessage({
      type: "erro",
      message: "Informe datas válidas para a janela de vendas.",
    });
  }

  if (endsAt <= startsAt) {
    redirectWithMessage({
      type: "erro",
      message: "A data final precisa ser maior que a data inicial.",
    });
  }

  await prisma.storeWindow.create({
    data: {
      startsAt,
      endsAt,
      status: StoreWindowStatus.SCHEDULED,
      message: normalizeOptional(parsed.data.message ?? ""),
    },
  });

  revalidatePath("/admin/janela-vendas");
  revalidatePath("/checkout");

  redirectWithMessage({
    type: "sucesso",
    message: "Janela de vendas criada com sucesso.",
  });
}

export async function openStoreWindowAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.STORE_WINDOW_MANAGE);

  const storeWindowId = getString(formData, "storeWindowId");

  if (!storeWindowId) {
    redirectWithMessage({
      type: "erro",
      message: "Janela de vendas inválida.",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.storeWindow.updateMany({
      where: {
        status: StoreWindowStatus.OPEN,
      },
      data: {
        status: StoreWindowStatus.CLOSED,
      },
    });

    await tx.storeWindow.update({
      where: {
        id: storeWindowId,
      },
      data: {
        status: StoreWindowStatus.OPEN,
      },
    });
  });

  revalidatePath("/admin/janela-vendas");
  revalidatePath("/checkout");

  redirectWithMessage({
    type: "sucesso",
    message:
      "Janela de vendas aberta. O checkout está liberado dentro do período configurado.",
  });
}

export async function closeStoreWindowAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.STORE_WINDOW_MANAGE);

  const storeWindowId = getString(formData, "storeWindowId");

  if (!storeWindowId) {
    redirectWithMessage({
      type: "erro",
      message: "Janela de vendas inválida.",
    });
  }

  await prisma.storeWindow.update({
    where: {
      id: storeWindowId,
    },
    data: {
      status: StoreWindowStatus.CLOSED,
    },
  });

  revalidatePath("/admin/janela-vendas");
  revalidatePath("/checkout");

  redirectWithMessage({
    type: "sucesso",
    message: "Janela de vendas fechada. O checkout foi bloqueado.",
  });
}
