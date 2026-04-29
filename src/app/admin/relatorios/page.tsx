import type { Metadata } from "next";
import { OrderStatus, PaymentStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Relatórios",
  description: "Indicadores básicos administrativos da loja.",
};

const orderStatusLabels = {
  [OrderStatus.AWAITING_PAYMENT]: "Aguardando pagamento",
  [OrderStatus.PENDING_COMPLEMENT]: "Pendente complemento",
  [OrderStatus.PAID_CONFIRMED]: "Pago confirmado",
  [OrderStatus.SHIPPED]: "Enviado",
  [OrderStatus.COMPLETED]: "Concluído",
  [OrderStatus.CANCELLED]: "Cancelado",
} satisfies Record<OrderStatus, string>;

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminReportsPage() {
  await requirePermission(PERMISSIONS.REPORTS_READ);

  const now = new Date();
  const last30Days = new Date(now);
  last30Days.setDate(now.getDate() - 30);

  const [
    totalOrders,
    ordersLast30Days,
    statusCounts,
    confirmedPayments,
    totalCustomers,
    approvedCustomers,
    totalProducts,
    outOfStockProducts,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: {
        createdAt: {
          gte: last30Days,
        },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.CONFIRMED,
      },
      _sum: {
        receivedAmountCents: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.customer.count(),
    prisma.customer.count({
      where: {
        status: "APPROVED",
      },
    }),
    prisma.product.count(),
    prisma.product.count({
      where: {
        OR: [
          {
            stockCurrent: {
              lte: 0,
            },
          },
          {
            status: "OUT_OF_STOCK",
          },
        ],
      },
    }),
    prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const statusCountMap = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count._all]),
  ) as Partial<Record<OrderStatus, number>>;

  const confirmedRevenueCents = confirmedPayments._sum.receivedAmountCents ?? 0;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">Relatórios</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Indicadores básicos
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Visão resumida para acompanhamento operacional. Exportações e
            gráficos avançados podem ficar para uma etapa posterior.
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-card">
          <span className="metric-label">Pedidos totais</span>
          <strong className="metric-value">{totalOrders}</strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">Pedidos em 30 dias</span>
          <strong className="metric-value">{ordersLast30Days}</strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">PIX confirmado</span>
          <strong className="metric-value">
            {formatCurrency(confirmedRevenueCents)}
          </strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">Pagamentos confirmados</span>
          <strong className="metric-value">
            {confirmedPayments._count._all}
          </strong>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="metric-card">
          <span className="metric-label">Clientes</span>
          <strong className="metric-value">{totalCustomers}</strong>
          <p className="mt-3 text-sm text-slate-600">
            Aprovados: {approvedCustomers}
          </p>
        </article>

        <article className="metric-card">
          <span className="metric-label">Produtos</span>
          <strong className="metric-value">{totalProducts}</strong>
          <p className="mt-3 text-sm text-slate-600">
            Sem estoque: {outOfStockProducts}
          </p>
        </article>

        <article className="metric-card">
          <span className="metric-label">Data do relatório</span>
          <strong className="mt-3 block text-lg font-semibold text-slate-950">
            {formatDateTime(now)}
          </strong>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Pedidos por status
        </h3>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Object.values(OrderStatus).map((status) => (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              key={status}
            >
              <p className="text-sm text-slate-600">
                {orderStatusLabels[status]}
              </p>

              <strong className="mt-2 block text-2xl font-bold text-slate-950">
                {statusCountMap[status] ?? 0}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Pedidos recentes
        </h3>

        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Nenhum pedido encontrado.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Criado em
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 align-top font-semibold text-slate-950">
                      {order.code}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-600">
                      {order.customer?.name ?? "Sem cliente vinculado"}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-600">
                      {orderStatusLabels[order.status]}
                    </td>

                    <td className="px-4 py-3 align-top font-semibold text-slate-950">
                      {formatCurrency(order.totalDueCents)}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-600">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
