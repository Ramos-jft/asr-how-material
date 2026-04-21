import { prisma } from "@/lib/prisma";

async function getDashboardMetrics() {
  try {
    const [
      products,
      customers,
      pendingOrders,
      reservedStockItems,
      lowStockProducts,
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
      prisma.product.count({
        where: {
          stockCurrent: {
            lte: prisma.product.fields.stockMin,
          },
        },
      }),
    ]);

    return {
      products,
      customers,
      pendingOrders,
      reservedStockItems,
      lowStockProducts,
      hasConnection: true,
    };
  } catch {
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

const nextSteps = [
  {
    title: "Clientes e aprovação",
    description:
      "Criar fluxo de cadastro, aprovação manual, temporário de 1 compra e bloqueio.",
  },
  {
    title: "Catálogo e imagens",
    description:
      "Entregar listagem pública, detalhe do produto, filtro por categoria, busca e upload no R2.",
  },
  {
    title: "Checkout + PIX manual",
    description:
      "Implementar pedido mínimo, desconto acima de R$ 1.000, reserva de estoque e confirmação manual.",
  },
  {
    title: "Pedidos, PDV e relatórios",
    description:
      "Fechar operação administrativa, venda direta, exportações e auditoria operacional.",
  },
];

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <main className="space-y-6">
      <section className="panel space-y-4">
        <div className="space-y-2">
          <span className="badge-brand">Fase atual</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Dashboard inicial do projeto
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            A fundação do banco e do RBAC já existe. Nesta entrega, a base agora
            tem autenticação por cookie httpOnly, proteção do painel e um ponto
            inicial para as próximas telas operacionais.
          </p>
        </div>

        {metrics.hasConnection ? null : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            O painel foi preparado, mas o banco ainda não respondeu neste ambiente.
            Rode as migrations, seed e importação antes de validar as métricas.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="metric-card">
          <span className="metric-label">Produtos</span>
          <strong className="metric-value">{metrics.products}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Clientes</span>
          <strong className="metric-value">{metrics.customers}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pedidos pendentes</span>
          <strong className="metric-value">{metrics.pendingOrders}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Reservas de estoque</span>
          <strong className="metric-value">{metrics.reservedStockItems}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Estoque crítico</span>
          <strong className="metric-value">{metrics.lowStockProducts}</strong>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel space-y-4">
          <h3 className="text-xl font-semibold text-slate-950">Próximos blocos de implementação</h3>
          <div className="space-y-3">
            {nextSteps.map((step, index) => (
              <article key={step.title} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="mb-2 flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <h4 className="font-semibold text-slate-900">{step.title}</h4>
                </div>
                <p className="text-sm leading-6 text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel space-y-4">
          <h3 className="text-xl font-semibold text-slate-950">Checklist imediato</h3>
          <ul className="space-y-3 text-sm leading-6 text-slate-600">
            <li>Atualizar `.env` com `JWT_SECRET` forte e URLs reais.</li>
            <li>Executar `npm run db:migrate`, `npm run db:seed` e `npm run db:import:products`.</li>
            <li>Validar login com o admin inicial.</li>
            <li>Substituir credenciais padrão antes de homologar.</li>
            <li>Começar a etapa de clientes + catálogo com base nesta estrutura.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
