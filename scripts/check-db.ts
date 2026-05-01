import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [users, admins, customers, products, orders] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        roles: {
          some: {
            role: {
              name: "ADMIN",
            },
          },
        },
      },
    }),
    prisma.customer.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);

  console.table([
    {
      users,
      admins,
      customers,
      products,
      orders,
    },
  ]);

  if (admins < 1) {
    throw new Error("Nenhum usuário ADMIN encontrado no banco.");
  }

  console.log("Conexão com o banco validada com sucesso.");
}

try {
  await main();
} catch (error) {
  console.error("Falha na validação do banco:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
