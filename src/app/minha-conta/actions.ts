"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function trimStringValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function getString(formData: FormData, field: string): string {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

function onlyDigits(value: string): string {
  return value.replaceAll(/\D/g, "");
}

function normalizeOptional(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized || null;
}

function redirectWithMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/minha-conta?${params.toString()}`);
}

const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  csaName: z.string().trim().optional(),
  charge: z.string().trim().optional(),
  phone: z.string().trim().min(10, "Informe um telefone válido."),
  email: z.preprocess(trimStringValue, z.email("Informe um e-mail válido.")),
  groupCode: z
    .string()
    .trim()
    .min(1, "Informe o grupo, unidade ou identificador."),

  zipCode: z.string().trim().min(8, "Informe o CEP."),
  state: z
    .string()
    .trim()
    .min(2, "Informe a UF.")
    .max(2, "Use apenas a sigla da UF.")
    .transform((value) => value.toUpperCase()),
  city: z.string().trim().min(2, "Informe a cidade."),
  district: z.string().trim().min(2, "Informe o bairro."),
  street: z.string().trim().min(2, "Informe o endereço."),
  number: z.string().trim().min(1, "Informe o número."),
  complement: z.string().trim().optional(),
  reference: z.string().trim().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: z
      .string()
      .min(6, "A nova senha deve ter pelo menos 6 caracteres."),
    newPasswordConfirmation: z
      .string()
      .min(6, "Confirme a nova senha com pelo menos 6 caracteres."),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    path: ["newPasswordConfirmation"],
    message: "As senhas não conferem.",
  });

export async function updateCustomerProfileAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireAuth();

  const parsed = profileSchema.safeParse({
    name: getString(formData, "name"),
    csaName: getString(formData, "csaName"),
    charge: getString(formData, "charge"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    groupCode: getString(formData, "groupCode"),

    zipCode: getString(formData, "zipCode"),
    state: getString(formData, "state"),
    city: getString(formData, "city"),
    district: getString(formData, "district"),
    street: getString(formData, "street"),
    number: getString(formData, "number"),
    complement: getString(formData, "complement"),
    reference: getString(formData, "reference"),
  });

  if (!parsed.success) {
    redirectWithMessage({
      type: "erro",
      message:
        parsed.error.issues[0]?.message ??
        "Revise os dados do cadastro e tente novamente.",
    });
  }

  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase();

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: {
          userId: auth.user.id,
        },
        select: {
          id: true,
        },
      });

      if (!customer) {
        throw new Error("Cadastro de comprador não encontrado.");
      }

      await tx.user.update({
        where: {
          id: auth.user.id,
        },
        data: {
          name: data.name,
          email: normalizedEmail,
        },
      });

      await tx.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          name: data.name,
          csaName: normalizeOptional(data.csaName),
          charge: normalizeOptional(data.charge),
          phone: onlyDigits(data.phone),
          email: normalizedEmail,
          groupCode: data.groupCode,
          address: {
            upsert: {
              create: {
                zipCode: onlyDigits(data.zipCode),
                state: data.state,
                city: data.city,
                district: data.district,
                street: data.street,
                number: data.number,
                complement: normalizeOptional(data.complement),
                reference: normalizeOptional(data.reference),
              },
              update: {
                zipCode: onlyDigits(data.zipCode),
                state: data.state,
                city: data.city,
                district: data.district,
                street: data.street,
                number: data.number,
                complement: normalizeOptional(data.complement),
                reference: normalizeOptional(data.reference),
              },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          action: "customer.update_own_profile",
          entity: "Customer",
          entityId: customer.id,
          payload: {
            email: normalizedEmail,
          },
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithMessage({
        type: "erro",
        message: "Este e-mail já está em uso por outro cadastro.",
      });
    }

    console.error("Erro ao atualizar cadastro do comprador:", error);

    redirectWithMessage({
      type: "erro",
      message: "Não foi possível atualizar o cadastro. Tente novamente.",
    });
  }

  revalidatePath("/minha-conta");
  revalidatePath("/checkout");
  revalidatePath("/pedidos");

  redirectWithMessage({
    type: "sucesso",
    message: "Cadastro atualizado com sucesso.",
  });
}

export async function updateCustomerPasswordAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireAuth();

  const parsed = passwordSchema.safeParse({
    currentPassword: getString(formData, "currentPassword"),
    newPassword: getString(formData, "newPassword"),
    newPasswordConfirmation: getString(formData, "newPasswordConfirmation"),
  });

  if (!parsed.success) {
    redirectWithMessage({
      type: "erro",
      message:
        parsed.error.issues[0]?.message ??
        "Revise os dados da senha e tente novamente.",
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: auth.user.id,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    redirectWithMessage({
      type: "erro",
      message: "Usuário não encontrado.",
    });
  }

  const currentPasswordMatches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordMatches) {
    redirectWithMessage({
      type: "erro",
      message: "Senha atual inválida.",
    });
  }

  const nextPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: nextPasswordHash,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "user.update_own_password",
        entity: "User",
        entityId: user.id,
        payload: {
          changedByUser: true,
        },
      },
    });
  });

  revalidatePath("/minha-conta");

  redirectWithMessage({
    type: "sucesso",
    message: "Senha alterada com sucesso.",
  });
}