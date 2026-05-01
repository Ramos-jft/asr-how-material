"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession } from "@/lib/auth/session";
import { hasPermission, PERMISSIONS, ROLES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export type LoginFormState = {
  error?: string;
};

const ADMIN_INTERNAL_LOGIN = "admin@admin";

type LoginIntent = "admin" | "buyer";

const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Informe seu login.")
  .transform((value) => value.toLowerCase())
  .refine(
    (value) =>
      value === ADMIN_INTERNAL_LOGIN ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Informe um e-mail válido.",
  );

const loginSchema = z.object({
  email: loginIdentifierSchema,
  password: z.string().min(5, "A senha deve ter pelo menos 5 caracteres."),
});

function getLoginIntent(formData: FormData): LoginIntent | undefined {
  const value = formData.get("loginIntent");

  if (value === "admin" || value === "buyer") {
    return value;
  }

  return undefined;
}

function getRedirectPath(input: {
  loginIntent?: LoginIntent;
  isAdmin: boolean;
}): string {
  if (input.loginIntent === "admin") {
    return "/admin";
  }

  if (input.loginIntent === "buyer") {
    return "/catalogo";
  }

  if (input.isAdmin) {
    return "/admin";
  }

  return "/catalogo";
}

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const loginIntent = getLoginIntent(formData);

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
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
    return {
      error: "Usuário ou senha inválidos.",
    };
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return {
      error: "Usuário ou senha inválidos.",
    };
  }

  const roles = Array.from(new Set(user.roles.map((item) => item.role.name)));

  const permissions = Array.from(
    new Set(
      user.roles.flatMap((item) =>
        item.role.permissions.map((permission) => permission.permission.name),
      ),
    ),
  );

  const isAdmin = hasPermission(permissions, PERMISSIONS.DASHBOARD_READ);
  const isBuyer =
    roles.includes(ROLES.CUSTOMER) &&
    !hasPermission(permissions, PERMISSIONS.DASHBOARD_READ);

  if (loginIntent === "admin" && !isAdmin) {
    return {
      error: "Usuário sem permissão para esta área.",
    };
  }

  if (loginIntent === "buyer" && !isBuyer) {
    return {
      error: "Usuário sem permissão para esta área.",
    };
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  await createSession({
    userId: user.id,
    roles,
    permissions,
  });

  redirect(
    getRedirectPath({
      loginIntent,
      isAdmin,
    }),
  );
}
