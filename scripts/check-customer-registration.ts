import { PrismaClient } from "@prisma/client";

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
      "Nenhum cliente encontrado. Informe um e-mail ou faça um cadastro antes de validar.",
    );
  }

  return latestCustomer.email;
}

async function main() {
  const email = await getCustomerEmail();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      customer: {
        include: {
          address: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`User não encontrado para o e-mail: ${email}`);
  }

  const customerRole = user.roles.find(
    (userRole) => userRole.role.name === "CUSTOMER",
  );

  const customer = user.customer;
  const address = customer?.address;

  console.table([
    {
      email,
      userCreated: Boolean(user),
      userStatus: user.status,
      hasCustomerRole: Boolean(customerRole),
      customerCreated: Boolean(customer),
      customerStatus: customer?.status ?? "NÃO ENCONTRADO",
      addressCreated: Boolean(address),
    },
  ]);

  if (!customerRole) {
    throw new Error("Role CUSTOMER não foi vinculada ao usuário.");
  }

  if (!customer) {
    throw new Error("Customer não foi criado/vinculado ao usuário.");
  }

  if (!address) {
    throw new Error("CustomerAddress não foi criado/vinculado ao cliente.");
  }

  console.log("Cadastro de comprador validado com sucesso.");
}

try {
  await main();
} catch (error) {
  console.error("Falha ao validar cadastro de comprador:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
