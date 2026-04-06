import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
      update: role,
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
    for (const permissionName of grantedPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleMap[roleName],
            permissionId: permissionMap[permissionName],
          },
        },
        update: {},
        create: {
          roleId: roleMap[roleName],
          permissionId: permissionMap[permissionName],
        },
      });
    }
  }

  const adminPasswordHash = await bcrypt.hash("Admin@123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@materialasr.local" },
    update: {
      name: "Administrador Inicial",
      passwordHash: adminPasswordHash,
    },
    create: {
      name: "Administrador Inicial",
      email: "admin@materialasr.local",
      passwordHash: adminPasswordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: roleMap.ADMIN,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: roleMap.ADMIN,
    },
  });

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });