"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuthenticatedRedirectPath } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/auth/permissions";
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
  loginIntent: z.enum(["admin", "buyer"]).optional(),
});

function getOptionalString(
  formData: FormData,
  field: string,
): string | undefined {
  const value = formData.get(field);

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isAdminLoginAllowed(permissions: readonly string[]): boolean {
  return hasPermission(permissions, PERMISSIONS.DASHBOARD_READ);
}

function isBuyerLoginAllowed(input: {
  roles: readonly string[];
  permissions: readonly string[];
}): boolean {
  return (
    input.roles.includes(ROLES.CUSTOMER) &&
    !hasPermission(input.permissions, PERMISSIONS.DASHBOARD_READ)
  );
}

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    loginIntent: getOptionalString(formData, "loginIntent"),
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

  if (user?.status !== "ACTIVE") {
    return { error: "Usuário ou senha inválidos." };
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return { error: "Usuário ou senha inválidos." };
  }

  const roles = Array.from(new Set(user.roles.map((item) => item.role.name)));
  const permissions = Array.from(
    new Set(
      user.roles.flatMap((item) =>
        item.role.permissions.map((permission) => permission.permission.name),
      ),
    ),
  );

  if (
    parsed.data.loginIntent === "admin" &&
    !isAdminLoginAllowed(permissions)
  ) {
    return {
      error:
        "Este usuário não possui permissão administrativa. Use o acesso de comprador.",
    };
  }

  if (
    parsed.data.loginIntent === "buyer" &&
    !isBuyerLoginAllowed({ roles, permissions })
  ) {
    return {
      error:
        "Este usuário não é um comprador. Use o acesso administrativo ou solicite liberação.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    userId: user.id,
    roles,
    permissions,
  });

  redirect(getAuthenticatedRedirectPath(permissions));
}
