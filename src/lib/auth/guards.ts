import "server-only";

import { redirect } from "next/navigation";

import { clearSession, getSession } from "@/lib/auth/session";
import {
  hasPermission,
  PERMISSIONS,
  ROLES,
  type PermissionName,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export function getAuthenticatedRedirectPath(
  permissions: readonly string[],
): string {
  if (hasPermission(permissions, PERMISSIONS.DASHBOARD_READ)) {
    return "/admin";
  }

  return "/catalogo";
}

function isAdminSession(permissions: readonly string[]): boolean {
  return hasPermission(permissions, PERMISSIONS.DASHBOARD_READ);
}

function isBuyerSession(input: {
  roles: readonly string[];
  permissions: readonly string[];
}): boolean {
  return (
    input.roles.includes(ROLES.CUSTOMER) &&
    !hasPermission(input.permissions, PERMISSIONS.DASHBOARD_READ)
  );
}

export async function requireAuth() {
  const session = await getSession();

  if (!session?.sub) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
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
    await clearSession();
    redirect("/login");
  }

  const roles = Array.from(
    new Set(user.roles.map((userRole) => userRole.role.name)),
  );

  const permissions = Array.from(
    new Set(
      user.roles.flatMap((userRole) =>
        userRole.role.permissions.map((item) => item.permission.name),
      ),
    ),
  );

  return {
    user,
    roles,
    permissions,
  };
}

export async function requirePermission(permission: PermissionName) {
  const auth = await requireAuth();

  if (!hasPermission(auth.permissions, permission)) {
    redirect("/acesso-negado");
  }

  return auth;
}

export async function requireBuyerAccess() {
  const session = await getSession();

  if (!session?.sub) {
    redirect("/login/comprador");
  }

  const auth = await requireAuth();

  const canAccessBuyerArea = isBuyerSession({
    roles: auth.roles,
    permissions: auth.permissions,
  });

  if (!canAccessBuyerArea) {
    redirect("/acesso-negado");
  }

  return auth;
}

export async function requireGuest() {
  const session = await getSession();

  if (session?.sub) {
    redirect(getAuthenticatedRedirectPath(session.permissions));
  }
}

export async function requireGuestForLoginIntent(
  intent: "admin" | "buyer",
): Promise<void> {
  const session = await getSession();

  if (!session?.sub) {
    return;
  }

  if (intent === "admin") {
    if (isAdminSession(session.permissions)) {
      redirect("/admin");
    }

    redirect("/acesso-negado");
  }

  if (
    isBuyerSession({
      roles: session.roles,
      permissions: session.permissions,
    })
  ) {
    redirect("/catalogo");
  }

  redirect("/acesso-negado");
}
