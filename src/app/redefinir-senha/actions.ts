"use server";

import { UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  isPasswordResetTokenValidForUser,
  verifyPasswordResetToken,
} from "@/lib/auth/password-reset";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, field: string): string {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

function redirectToResetPage(input: {
  token: string;
  type: "erro" | "sucesso";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/redefinir-senha/${encodeURIComponent(input.token)}?${params}`);
}

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token inválido."),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    passwordConfirmation: z
      .string()
      .min(6, "Confirme a senha com pelo menos 6 caracteres."),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "As senhas não conferem.",
  });

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const parsed = resetPasswordSchema.safeParse({
    token: getString(formData, "token"),
    password: getString(formData, "password"),
    passwordConfirmation: getString(formData, "passwordConfirmation"),
  });

  const token = getString(formData, "token");

  if (!parsed.success) {
    redirectToResetPage({
      token,
      type: "erro",
      message:
        parsed.error.issues[0]?.message ??
        "Revise a nova senha e tente novamente.",
    });
  }

  const verifiedToken = await verifyPasswordResetToken(parsed.data.token);

  if (!verifiedToken) {
    redirect("/recuperar-senha?erro=Link inválido ou expirado.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: verifiedToken.userId,
    },
    select: {
      id: true,
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

  if (
    user?.status !== UserStatus.ACTIVE ||
    user.customer === null ||
    !isPasswordResetTokenValidForUser(verifiedToken, user)
  ) {
    redirect("/recuperar-senha?erro=Link inválido ou expirado.");
  }

  const nextPasswordHash = await bcrypt.hash(parsed.data.password, 12);

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
        action: "user.reset_password",
        entity: "User",
        entityId: user.id,
        payload: {
          email: user.email,
          resetByToken: true,
        },
      },
    });
  });

  redirect(
    `/login/comprador?sucesso=${encodeURIComponent(
      "Senha alterada com sucesso. Entre com a nova senha.",
    )}`,
  );
}
