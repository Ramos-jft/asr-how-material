import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatus, PaymentStatus } from "@prisma/client";

import { requireAuth } from "@/lib/auth/guards";
import { formatCurrencyFromCents, formatInteger } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meus pedidos",
  description:
    "Acompanhe seus pedidos, valores, status e instruções de pagamento.",
};

const orderStatusLabels = {
  [OrderStatus.AWAITING_PAYMENT]: "Aguardando pagamento",
  [OrderStatus.PENDING_COMPLEMENT]: "Pendente complemento",
  [OrderStatus.PAID_CONFIRMED]: "Pago confirmado",
  [OrderStatus.SHIPPED]: "Enviado",
  [OrderStatus.COMPLETED]: "Concluído",
  [OrderStatus.CANCELLED]: "Cancelado",
} satisfies Record<OrderStatus, string>;

const orderStatusClassNames = {
  [OrderStatus.AWAITING_PAYMENT]: "border-amber-200 bg-amber-50 text-amber-800",
  [OrderStatus.PENDING_COMPLEMENT]:
    "border-orange-200 bg-orange-50 text-orange-800",
  [OrderStatus.PAID_CONFIRMED]:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  [OrderStatus.SHIPPED]: "border-blue-200 bg-blue-50 text-blue-800",
  [OrderStatus.COMPLETED]: "border-slate-200 bg-slate-100 text-slate-700",
  [OrderStatus.CANCELLED]: "border-red-200 bg-red-50 text-red-700",
} satisfies Record<OrderStatus, string>;

function formatDateTime(date: Date | null): string {
  if (!date) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getConfirmedPaymentsTotal(
  payments: ReadonlyArray<{ receivedAmountCents: number }>,
): number {
  return payments.reduce(
    (total, payment) => total + payment.receivedAmountCents,
    0,
  );
}

function canShowPaymentLink(status: OrderStatus): boolean {
  return (
    status === OrderStatus.AWAITING_PAYMENT ||
    status === OrderStatus.PENDING_COMPLEMENT
  );
}

function OrderStatusBadge({ status }: Readonly<{ status: OrderStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusClassNames[status]}`}
    >
      {orderStatusLabels[status]}
    </span>
  );
}

export default async function MyOrdersPage() {
  const auth = await requireAuth();

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        {
          customer: {
            userId: auth.user.id,
          },
        },
        {
          createdByUserId: auth.user.id,
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          sku: true,
          name: true,
          quantity: true,
          unitPriceCents: true,
          lineTotalCents: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      payments: {
        where: {
          status: PaymentStatus.CONFIRMED,
        },
        select: {
          id: true,
          method: true,
          receivedAmountCents: true,
          differenceCents: true,
          confirmedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return (
    <main className="page-shell items-start">
      <section className="panel w-full space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="badge-brand">Meus pedidos</span>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Acompanhe seus pedidos
            </h1>

            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Consulte o status, os itens reservados, valores devidos e
              instruções de pagamento dos seus pedidos.
            </p>
          </div>

          <Link className="button-secondary" href="/catalogo">
            Voltar ao catálogo
          </Link>
        </header>

        {orders.length === 0 ? (
          <div className="mini-card space-y-4">
            <p className="text-base font-medium text-slate-950">
              Nenhum pedido encontrado.
            </p>

            <p className="text-sm leading-6 text-slate-600">
              Quando você finalizar um pedido, ele aparecerá nesta tela.
            </p>

            <Link className="button-primary inline-flex" href="/catalogo">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const confirmedPaymentsTotal = getConfirmedPaymentsTotal(
                order.payments,
              );

              const remainingAmountCents = Math.max(
                0,
                order.totalDueCents - confirmedPaymentsTotal,
              );

              return (
                <article
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  key={order.id}
                >
                  <div className="border-b border-slate-100 bg-slate-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-950">
                            Pedido {order.code}
                          </h2>

                          <OrderStatusBadge status={order.status} />
                        </div>

                        <p className="text-sm text-slate-600">
                          Criado em {formatDateTime(order.createdAt)}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3 lg:text-right">
                        <div>
                          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Total
                          </span>

                          <strong className="text-lg text-slate-950">
                            {formatCurrencyFromCents(order.totalDueCents)}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Recebido
                          </span>

                          <strong className="text-lg text-slate-950">
                            {formatCurrencyFromCents(confirmedPaymentsTotal)}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Falta
                          </span>

                          <strong className="text-lg text-slate-950">
                            {formatCurrencyFromCents(remainingAmountCents)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <section className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-slate-950">
                          Itens do pedido
                        </h3>

                        <p className="text-sm leading-6 text-slate-600">
                          Os preços abaixo foram gravados no momento da criação
                          do pedido.
                        </p>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                Produto
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                Qtd.
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                Unitário
                              </th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                Total
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100 bg-white">
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 align-top">
                                  <p className="font-semibold text-slate-950">
                                    {item.name}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    SKU: {item.sku}
                                  </p>
                                </td>

                                <td className="px-4 py-3 align-top text-slate-700">
                                  {formatInteger(item.quantity)}
                                </td>

                                <td className="px-4 py-3 align-top text-slate-700">
                                  {formatCurrencyFromCents(item.unitPriceCents)}
                                </td>

                                <td className="px-4 py-3 align-top font-semibold text-slate-950">
                                  {formatCurrencyFromCents(item.lineTotalCents)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <aside className="space-y-4">
                      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-semibold text-slate-950">
                          Resumo financeiro
                        </h3>

                        <dl className="mt-4 space-y-3 text-sm">
                          <div className="flex justify-between gap-4">
                            <dt className="text-slate-600">Subtotal</dt>
                            <dd className="font-semibold text-slate-950">
                              {formatCurrencyFromCents(order.subtotalCents)}
                            </dd>
                          </div>

                          <div className="flex justify-between gap-4">
                            <dt className="text-slate-600">Desconto</dt>
                            <dd className="font-semibold text-slate-950">
                              {formatCurrencyFromCents(
                                order.discountCentsApplied,
                              )}
                            </dd>
                          </div>

                          <div className="flex justify-between gap-4">
                            <dt className="text-slate-600">Complemento</dt>
                            <dd className="font-semibold text-slate-950">
                              {formatCurrencyFromCents(
                                order.additionalDueCents,
                              )}
                            </dd>
                          </div>

                          <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                            <dt className="font-semibold text-slate-950">
                              Total devido
                            </dt>
                            <dd className="font-bold text-slate-950">
                              {formatCurrencyFromCents(order.totalDueCents)}
                            </dd>
                          </div>
                        </dl>

                        {order.discountExpiresAt ? (
                          <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                            Desconto válido até{" "}
                            <strong>
                              {formatDateTime(order.discountExpiresAt)}
                            </strong>
                            .
                          </p>
                        ) : null}
                      </section>

                      {order.payments.length > 0 ? (
                        <section className="rounded-2xl border border-slate-200 bg-white p-4">
                          <h3 className="font-semibold text-slate-950">
                            Pagamentos confirmados
                          </h3>

                          <div className="mt-3 space-y-3">
                            {order.payments.map((payment) => (
                              <div
                                className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm"
                                key={payment.id}
                              >
                                <div className="flex justify-between gap-4">
                                  <span className="font-semibold text-slate-950">
                                    {payment.method}
                                  </span>

                                  <strong className="text-slate-950">
                                    {formatCurrencyFromCents(
                                      payment.receivedAmountCents,
                                    )}
                                  </strong>
                                </div>

                                <p className="mt-1 text-slate-600">
                                  Confirmado em{" "}
                                  {formatDateTime(payment.confirmedAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {canShowPaymentLink(order.status) ? (
                        <Link
                          className="button-primary flex w-full"
                          href={`/pagamento/${order.code}`}
                        >
                          Ver instruções de pagamento
                        </Link>
                      ) : (
                        <Link
                          className="button-secondary flex w-full"
                          href={`/pagamento/${order.code}`}
                        >
                          Ver detalhes do pagamento
                        </Link>
                      )}
                    </aside>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
