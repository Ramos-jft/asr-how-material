import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_LOGIN = "admin@admin";
const ADMIN_PASSWORD = "How26";

const LEGACY_ADMIN_LOGINS = ["Admin", "admin", "admin@materialasr.local"];

async function main() {
  const roles = [
    { name: "ADMIN", description: "Acesso total" },
    { name: "PDV_OPERATOR", description: "Operador de PDV" },
    { name: "STOCK_OPERATOR", description: "Estoquista" },
    { name: "SUPPORT", description: "Atendimento" },
    { name: "CUSTOMER", description: "Cliente" },
  ];

  const permissions = [
    "dashboard.read",
    "reports.read",
    "reports.export",
    "products.read",
    "products.create",
    "products.update",
    "products.images.upload",
    "stock.read",
    "stock.adjust",
    "customers.read",
    "customers.approve",
    "orders.read",
    "orders.update_status",
    "orders.cancel_release",
    "payments.confirm_pix",
    "pdv.create_order",
    "store_window.manage",
    "notifications.send",
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
      },
      create: role,
    });
  }

  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: { name },
      create: { name },
    });
  }

  const roleMap = Object.fromEntries(
    (await prisma.role.findMany()).map((role) => [role.name, role.id]),
  );

  const permissionMap = Object.fromEntries(
    (await prisma.permission.findMany()).map((permission) => [
      permission.name,
      permission.id,
    ]),
  );

  const grants: Record<string, string[]> = {
    ADMIN: permissions,
    PDV_OPERATOR: [
      "products.read",
      "stock.read",
      "orders.read",
      "pdv.create_order",
    ],
    STOCK_OPERATOR: ["products.read", "stock.read", "stock.adjust"],
    SUPPORT: ["orders.read", "orders.update_status", "notifications.send"],
    CUSTOMER: [],
  };

  for (const [roleName, grantedPermissions] of Object.entries(grants)) {
    const roleId = roleMap[roleName];

    if (!roleId) {
      throw new Error(`Role não encontrada no seed: ${roleName}`);
    }

    for (const permissionName of grantedPermissions) {
      const permissionId = permissionMap[permissionName];

      if (!permissionId) {
        throw new Error(`Permissão não encontrada no seed: ${permissionName}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: ADMIN_LOGIN },
        {
          email: {
            in: LEGACY_ADMIN_LOGINS,
          },
        },
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const admin = existingAdmin
    ? await prisma.user.update({
        where: {
          id: existingAdmin.id,
        },
        data: {
          name: "Administrador",
          email: ADMIN_LOGIN,
          passwordHash: adminPasswordHash,
          status: "ACTIVE",
        },
      })
    : await prisma.user.create({
        data: {
          name: "Administrador",
          email: ADMIN_LOGIN,
          passwordHash: adminPasswordHash,
          status: "ACTIVE",
        },
      });

  const adminRoleId = roleMap.ADMIN;

  if (!adminRoleId) {
    throw new Error("Role ADMIN não encontrada.");
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRoleId,
    },
  });

  console.log("Seed concluído com sucesso.");
  console.log(`Admin temporário criado/atualizado: ${ADMIN_LOGIN}`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
