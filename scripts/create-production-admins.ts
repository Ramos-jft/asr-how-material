import { existsSync } from "node:fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient, UserStatus } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 6;

function getEnvFileFromArgs(): string {
  const envFileArg = process.argv.find((arg) => arg.startsWith("--env-file="));

  if (envFileArg) {
    return envFileArg.replace("--env-file=", "").trim();
  }

  if (process.env.ADMINS_ENV_FILE) {
    return process.env.ADMINS_ENV_FILE.trim();
  }

  return ".env";
}

function loadEnvFile(): void {
  const envFile = getEnvFileFromArgs();

  if (!existsSync(envFile)) {
    throw new Error(`Arquivo de ambiente não encontrado: ${envFile}`);
  }

  dotenv.config({
    path: envFile,
    override: true,
  });

  console.log(`Variáveis carregadas de: ${envFile}`);
}

loadEnvFile();

const prisma = new PrismaClient();

type AdminInput = {
  email: string;
  password: string;
  name: string;
  label: string;
};

function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Variável obrigatória ausente ou vazia: ${key}`);
  }

  return value;
}

function getDatabaseUrlInfo(databaseUrl: string) {
  const url = new URL(databaseUrl);

  return {
    hostname: url.hostname,
    databaseName: url.pathname.replace("/", "") || "não identificado",
  };
}

function validateProductionDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não encontrada.");
  }

  const { hostname, databaseName } = getDatabaseUrlInfo(databaseUrl);

  console.log("Banco alvo detectado:");
  console.log(`- Host: ${hostname}`);
  console.log(`- Database: ${databaseName}`);

  const isLocalDatabase =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("host.docker.internal");

  if (isLocalDatabase) {
    throw new Error(
      [
        "DATABASE_URL aponta para banco local.",
        "O script foi interrompido para evitar criar admins no banco errado.",
        "Se você quer criar admins em produção, ajuste DATABASE_URL no arquivo usado pelo script.",
      ].join(" "),
    );
  }
}

function validateEmail(email: string, label: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error(`${label} possui e-mail inválido: ${email}`);
  }
}

function validatePassword(password: string, label: string): void {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `${label} precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
}

function buildAdmins(): AdminInput[] {
  const admins: AdminInput[] = [
    {
      label: "ADMIN_2",
      email: getRequiredEnv("ADMIN_2_EMAIL").toLowerCase(),
      password: getRequiredEnv("ADMIN_2_PASSWORD"),
      name: getRequiredEnv("ADMIN_2_NAME"),
    },
    {
      label: "ADMIN_3",
      email: getRequiredEnv("ADMIN_3_EMAIL").toLowerCase(),
      password: getRequiredEnv("ADMIN_3_PASSWORD"),
      name: getRequiredEnv("ADMIN_3_NAME"),
    },
  ];

  for (const admin of admins) {
    validateEmail(admin.email, admin.label);
    validatePassword(admin.password, admin.label);
  }

  const duplicatedEmails = admins
    .map((admin) => admin.email)
    .filter((email, index, emails) => emails.indexOf(email) !== index);

  if (duplicatedEmails.length > 0) {
    throw new Error(
      `E-mails duplicados encontrados: ${Array.from(
        new Set(duplicatedEmails),
      ).join(", ")}`,
    );
  }

  return admins;
}

async function getAdminRoleId(): Promise<string> {
  const adminRole = await prisma.role.findUnique({
    where: {
      name: "ADMIN",
    },
    select: {
      id: true,
    },
  });

  if (!adminRole) {
    throw new Error(
      "Role ADMIN não encontrada. Rode primeiro o seed principal para criar roles e permissões.",
    );
  }

  return adminRole.id;
}

async function createOrUpdateAdmin(admin: AdminInput, adminRoleId: string) {
  const passwordHash = await bcrypt.hash(admin.password, 12);

  const user = await prisma.user.upsert({
    where: {
      email: admin.email,
    },
    update: {
      name: admin.name,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: admin.name,
      email: admin.email,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRoleId,
    },
  });

  return user;
}

async function main() {
  validateProductionDatabase();

  const admins = buildAdmins();
  const adminRoleId = await getAdminRoleId();

  console.log("Criando/atualizando admins de produção...");

  for (const admin of admins) {
    const user = await createOrUpdateAdmin(admin, adminRoleId);

    console.log(`Admin configurado: ${user.name} <${user.email}>`);
  }

  console.log("Concluído. As senhas não foram exibidas por segurança.");
}

try {
  await main();
} catch (error) {
  console.error("Falha ao criar admins de produção:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
