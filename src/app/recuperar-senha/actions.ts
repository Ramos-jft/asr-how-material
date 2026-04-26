"use server";

import { UserStatus } from "@prisma/client";
import { z } from "zod";

import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type RequestPasswordResetFormState = {
  success?: boolean;
  message?: string;
  devResetUrl?: string;
};

function trimStringValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

const requestPasswordResetSchema = z.object({
  email: z.preprocess(trimStringValue, z.email("Informe um e-mail válido.")),
});

function getGenericSuccessMessage(): string {
  return "Se existir uma conta de comprador ativa com este e-mail, enviaremos as instruções para redefinir a senha.";
}

export async function requestPasswordResetAction(
  _previousState: RequestPasswordResetFormState,
  formData: FormData,
): Promise<RequestPasswordResetFormState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Informe um e-mail válido.",
    };
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      status: true,
      customer: {
        select: {
          id: true,
        },
      },
    },
  });

  if (user?.status !== UserStatus.ACTIVE || user.customer === null) {
    return {
      success: true,
      message: getGenericSuccessMessage(),
    };
  }

  const token = await createPasswordResetToken({
    userId: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
  });

  const resetPath = `/redefinir-senha/${encodeURIComponent(token)}`;
  const resetUrl = new URL(resetPath, env.APP_BASE_URL).toString();

  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  if (!emailResult.sent) {
    console.error(
      "Recuperação de senha solicitada, mas o envio de e-mail não está configurado:",
      emailResult.reason,
    );

    if (env.NODE_ENV === "development") {
      return {
        success: true,
        message:
          "E-mail não configurado em desenvolvimento. Use o link abaixo para testar a redefinição de senha.",
        devResetUrl: resetUrl,
      };
    }

    return {
      success: false,
      message:
        "Envio de e-mail não configurado. Entre em contato com o suporte.",
    };
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "user.request_password_reset",
      entity: "User",
      entityId: user.id,
      payload: {
        email: user.email,
      },
    },
  });

  return {
    success: true,
    message: getGenericSuccessMessage(),
  };
}
