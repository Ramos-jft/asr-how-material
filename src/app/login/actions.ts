"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type LoginFormState = {
  error?: string;
};

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Informe um e-mail válido.");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { error: "Usuário ou senha inválidos." };
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return { error: "Usuário ou senha inválidos." };
  }

  const roles = user.roles.map((item) => item.role.name);
  const permissions = user.roles.flatMap((item) =>
    item.role.permissions.map((permission) => permission.permission.name),
  );

  await createSession({
    userId: user.id,
    roles,
    permissions,
  });

  redirect("/admin");
}
