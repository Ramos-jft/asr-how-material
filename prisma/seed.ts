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

type AdminConfig = {
  email: string;
  password: string;
  name: string;
};

function isProductionLikeEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    Boolean(process.env.DATABASE_URL?.includes("neon.tech"))
  );
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validateEmail(email: string, source: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error(
      `${source} precisa ser um e-mail válido. Exemplo: admin@materialasr.local`,
    );
  }
}

function validatePassword(password: string, source: string): void {
  if (password.trim().length === 0) {
    throw new Error(`${source} não pode ficar vazio.`);
  }
}

function validateName(name: string, source: string): void {
  if (!name) {
    throw new Error(`${source} não pode ficar vazio.`);
  }
}

function getPrimaryAdminConfig(): AdminConfig {
  const isProductionLike = isProductionLikeEnvironment();

  const email = normalizeEmail(
    process.env.ADMIN_EMAIL ??
      (isProductionLike ? "" : DEFAULT_DEV_ADMIN_EMAIL),
  );

  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? DEFAULT_ADMIN_NAME).trim();

  validateEmail(email, "ADMIN_EMAIL");
  validatePassword(password, "ADMIN_PASSWORD");
  validateName(name, "ADMIN_NAME");

  return {
    email,
    password,
    name,
  };
}

function getOptionalAdminConfig(index: 2 | 3): AdminConfig | null {
  const emailKey = `ADMIN_${index}_EMAIL`;
  const passwordKey = `ADMIN_${index}_PASSWORD`;
  const nameKey = `ADMIN_${index}_NAME`;

  const rawEmail = process.env[emailKey];
  const rawPassword = process.env[passwordKey];
  const rawName = process.env[nameKey];

  const hasAnyValue = Boolean(rawEmail || rawPassword || rawName);

  if (!hasAnyValue) {
    return null;
  }

  if (!rawEmail) {
    throw new Error(
      `${emailKey} é obrigatório quando ${passwordKey} ou ${nameKey} estiver definido.`,
    );
  }

  if (!rawPassword) {
    throw new Error(
      `${passwordKey} é obrigatório quando ${emailKey} ou ${nameKey} estiver definido.`,
    );
  }

  const email = normalizeEmail(rawEmail);
  const password = rawPassword;
  const name = (rawName ?? `Administrador ${index}`).trim();

  validateEmail(email, emailKey);
  validatePassword(password, passwordKey);
  validateName(name, nameKey);

  return {
    email,
    password,
    name,
  };
}

function getAdminConfigs(): AdminConfig[] {
  const configs = [
    getPrimaryAdminConfig(),
    getOptionalAdminConfig(2),
    getOptionalAdminConfig(3),
  ].filter((config): config is AdminConfig => config !== null);

  const duplicatedEmails = configs
    .map((config) => config.email)
    .filter((email, index, emails) => emails.indexOf(email) !== index);

  if (duplicatedEmails.length > 0) {
    throw new Error(
      `Existem e-mails de admin duplicados no seed: ${Array.from(
        new Set(duplicatedEmails),
      ).join(", ")}`,
    );
  }

  return configs;
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

async function seedAdminUser(
  roleMap: Record<string, string>,
  adminConfig: AdminConfig,
): Promise<string> {
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

async function seedAdminUsers(roleMap: Record<string, string>) {
  const adminConfigs = getAdminConfigs();
  const configuredEmails: string[] = [];

  for (const adminConfig of adminConfigs) {
    const email = await seedAdminUser(roleMap, adminConfig);
    configuredEmails.push(email);
  }

  return configuredEmails;
}

async function main() {
  const roleMap = await seedRolesAndPermissions();
  const adminEmails = await seedAdminUsers(roleMap);

  console.log("Seed concluído com sucesso.");
  console.log("Admins configurados:");

  for (const email of adminEmails) {
    console.log(`- ${email}`);
  }

  console.log("As senhas não foram exibidas por segurança.");
}

try {
  await main();
} catch (error) {
  console.error("Falha ao executar seed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
