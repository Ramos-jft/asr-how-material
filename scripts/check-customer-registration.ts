import { PrismaClient } from "@prisma/client";

import { canCustomerBuy } from "../src/domain/customer-policy";

const prisma = new PrismaClient();

async function getCustomerEmail(): Promise<string> {
  const emailArg = process.argv[2]?.trim().toLowerCase();

  if (emailArg) {
    return emailArg;
  }

  const latestCustomer = await prisma.customer.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      email: true,
    },
  });

  if (!latestCustomer) {
    throw new Error(
      "Nenhum cliente encontrado. Informe um e-mail ou cadastre um comprador antes de validar.",
    );
  }

  return latestCustomer.email;
}

async function main() {
  const email = await getCustomerEmail();

  const customer = await prisma.customer.findUnique({
    where: {
      email,
    },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
      address: true,
    },
  });

  if (!customer) {
    throw new Error(`Customer não encontrado para o e-mail: ${email}`);
  }

  const roleNames =
    customer.user?.roles.map((userRole) => userRole.role.name).join(", ") ?? "";

  const purchasePolicy = canCustomerBuy({
    status: customer.status,
    temporaryPurchaseRemaining: customer.temporaryPurchaseRemaining,
  });

  console.table([
    {
      email: customer.email,
      customerStatus: customer.status,
      temporaryPurchaseRemaining: customer.temporaryPurchaseRemaining,
      userCreated: Boolean(customer.user),
      userStatus: customer.user?.status ?? "NÃO ENCONTRADO",
      roles: roleNames || "NENHUMA",
      addressCreated: Boolean(customer.address),
      canBuy: purchasePolicy.canBuy,
      reason: purchasePolicy.reason ?? "Liberado para compra",
    },
  ]);

  if (!customer.user) {
    throw new Error("Customer não possui User vinculado.");
  }

  if (!roleNames.includes("CUSTOMER")) {
    throw new Error("User não possui role CUSTOMER.");
  }

  if (!customer.address) {
    throw new Error("Customer não possui endereço vinculado.");
  }

  console.log("Validação de aprovação concluída.");
}

try {
  await main();
} catch (error) {
  console.error("Falha ao validar aprovação do cliente:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
