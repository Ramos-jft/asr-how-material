import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_DEV_ADMIN_EMAIL = "admin@materialasr.local";
const DEFAULT_ADMIN_NAME = "Administrador Inicial";

const roles = [
  { name: "ADMIN", description: "Acesso total" },
  { name: "PDV_OPERATOR", description: "Operador de PDV" },
  { name: "STOCK_OPERATOR", description: "Estoquista" },
  { name: "SUPPORT", description: "Atendimento" },
  { name: "CUSTOMER", description: "Cliente" },
] as const;

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
] as const;

const grants: Record<string, readonly string[]> = {
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

function isProductionLikeEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    Boolean(process.env.DATABASE_URL?.includes("neon.tech"))
  );
}

function getAdminConfig() {
  const isProductionLike = isProductionLikeEnvironment();

  const email = (
    process.env.ADMIN_EMAIL ?? (isProductionLike ? "" : DEFAULT_DEV_ADMIN_EMAIL)
  )
    .trim()
    .toLowerCase();

  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? DEFAULT_ADMIN_NAME).trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error(
      "ADMIN_EMAIL precisa ser um e-mail válido. Exemplo: admin@materialasr.local",
    );
  }

  if (password.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD precisa ter pelo menos 12 caracteres. Defina essa variável no .env local ou na Vercel.",
    );
  }

  if (!name) {
    throw new Error("ADMIN_NAME não pode ficar vazio.");
  }

  return {
    email,
    password,
    name,
  };
}

function getRequiredId(map: Record<string, string>, key: string): string {
  const id = map[key];

  if (!id) {
    throw new Error(`Registro obrigatório não encontrado no seed: ${key}`);
  }

  return id;
}

async function seedRolesAndPermissions() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
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

  for (const [roleName, grantedPermissions] of Object.entries(grants)) {
    const roleId = getRequiredId(roleMap, roleName);

    for (const permissionName of grantedPermissions) {
      const permissionId = getRequiredId(permissionMap, permissionName);

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

  return roleMap;
}

async function seedAdminUser(roleMap: Record<string, string>) {
  const adminConfig = getAdminConfig();
  const adminPasswordHash = await bcrypt.hash(adminConfig.password, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminConfig.email },
    update: {
      name: adminConfig.name,
      passwordHash: adminPasswordHash,
      status: "ACTIVE",
    },
    create: {
      name: adminConfig.name,
      email: adminConfig.email,
      passwordHash: adminPasswordHash,
      status: "ACTIVE",
    },
  });

  const adminRoleId = getRequiredId(roleMap, "ADMIN");

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

  return adminConfig.email;
}

async function main() {
  const roleMap = await seedRolesAndPermissions();
  const adminEmail = await seedAdminUser(roleMap);

  console.log("Seed concluído com sucesso.");
  console.log(`Admin configurado: ${adminEmail}`);
  console.log("A senha não foi exibida por segurança.");
}

try {
  await main();
} catch (error) {
  console.error("Falha ao executar seed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
