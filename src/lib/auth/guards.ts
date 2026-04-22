import "server-only";

import { redirect } from "next/navigation";

import { clearSession, getSession } from "@/lib/auth/session";
import {
  hasPermission,
  PERMISSIONS,
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

export async function requireGuest() {
  const session = await getSession();

  if (session?.sub) {
    redirect(getAuthenticatedRedirectPath(session.permissions));
  }
}
