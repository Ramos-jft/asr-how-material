import { prisma } from "@/lib/prisma";

async function getDashboardMetrics() {
  try {
    const [
      products,
      customers,
      pendingOrders,
      reservedStockItems,
      productsForStockCheck,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.order.count({
        where: {
          status: {
            in: ["AWAITING_PAYMENT", "PENDING_COMPLEMENT"],
          },
        },
      }),
      prisma.stockMovement.count({
        where: {
          type: "RESERVE",
        },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          stockCurrent: true,
          stockMin: true,
        },
      }),
    ]);

    const lowStockProducts = productsForStockCheck.filter(
      (product) => product.stockCurrent <= product.stockMin,
    ).length;

    return {
      products,
      customers,
      pendingOrders,
      reservedStockItems,
      lowStockProducts,
      hasConnection: true,
    };
  } catch (error) {
    console.error("Falha ao carregar métricas do dashboard:", error);

    return {
      products: 0,
      customers: 0,
      pendingOrders: 0,
      reservedStockItems: 0,
      lowStockProducts: 0,
      hasConnection: false,
    };
  }
}

const cards = [
  {
    label: "Produtos cadastrados",
    key: "products",
  },
  {
    label: "Clientes cadastrados",
    key: "customers",
  },
  {
    label: "Pedidos pendentes",
    key: "pendingOrders",
  },
  {
    label: "Reservas de estoque",
    key: "reservedStockItems",
  },
  {
    label: "Itens em estoque crítico",
    key: "lowStockProducts",
  },
] as const;

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Painel administrativo
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Visão geral da operação
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Acompanhe os principais indicadores da loja, clientes, pedidos e
          estoque.
        </p>
      </div>

      {metrics.hasConnection ? null : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Não foi possível carregar os indicadores neste momento. Verifique a
          conexão com o banco de dados e tente novamente.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <strong className="mt-3 block text-3xl font-bold text-slate-950">
              {metrics[card.key]}
            </strong>
          </article>
        ))}
      </div>
    </section>
  );
}
