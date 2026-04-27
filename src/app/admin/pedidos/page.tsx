import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatus, PaymentStatus } from "@prisma/client";

import {
  cancelOrderAndReleaseStockAction,
  confirmPixPaymentAction,
} from "@/app/admin/pedidos/actions";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedidos",
  description: "Administração de pedidos e confirmação manual de PIX.",
};

type AdminPedidosPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

const statusLabel: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  PENDING_COMPLEMENT: "Pendente complemento",
  PAID_CONFIRMED: "Pago confirmado",
  SHIPPED: "Enviado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const statusClassName: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-800",
  PENDING_COMPLEMENT: "border-orange-200 bg-orange-50 text-orange-800",
  PAID_CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  SHIPPED: "border-blue-200 bg-blue-50 text-blue-800",
  COMPLETED: "border-slate-200 bg-slate-100 text-slate-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

const orderStatusOptions = Object.values(OrderStatus);

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateTime(date: Date | null): string {
  if (!date) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function isOrderStatus(value: string | undefined): value is OrderStatus {
  if (!value) {
    return false;
  }

  return orderStatusOptions.includes(value as OrderStatus);
}

async function getSelectedStatus(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
): Promise<OrderStatus | null> {
  const params = await searchParams;
  const rawStatus = Array.isArray(params?.status)
    ? params.status[0]
    : params?.status;

  if (!isOrderStatus(rawStatus)) {
    return null;
  }

  return rawStatus;
}

function canConfirmPayment(status: OrderStatus): boolean {
  return (
    status === OrderStatus.AWAITING_PAYMENT ||
    status === OrderStatus.PENDING_COMPLEMENT
  );
}

function canCancelAndReleaseStock(status: OrderStatus): boolean {
  return status === OrderStatus.AWAITING_PAYMENT;
}

function OrderStatusBadge({ status }: Readonly<{ status: OrderStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

function getConfirmedPaymentsTotal(
  payments: ReadonlyArray<{ receivedAmountCents: number }>,
): number {
  return payments.reduce(
    (total, payment) => total + payment.receivedAmountCents,
    0,
  );
}

export default async function AdminPedidosPage({
  searchParams,
}: AdminPedidosPageProps) {
  const auth = await requirePermission(PERMISSIONS.ORDERS_READ);
  const selectedStatus = await getSelectedStatus(searchParams);

  const canConfirmPix = hasPermission(
    auth.permissions,
    PERMISSIONS.PAYMENTS_CONFIRM_PIX,
  );

  const canCancelRelease = hasPermission(
    auth.permissions,
    PERMISSIONS.ORDERS_CANCEL_RELEASE,
  );

  const [orders, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where: selectedStatus
        ? {
            status: selectedStatus,
          }
        : undefined,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
            groupCode: true,
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
            notes: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const countsByStatus = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count._all]),
  ) as Partial<Record<OrderStatus, number>>;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">Pedidos</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Administração de pedidos
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Consulte pedidos, acompanhe valores devidos e confirme manualmente
            pagamentos via PIX. Quando o valor recebido for menor que o total
            devido, o pedido ficará como pendente de complemento.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          Filtros
        </h3>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/pedidos"
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selectedStatus === null
                ? "border-blue-800 bg-blue-800 text-white"
                : "border-slate-300 text-slate-700 hover:border-blue-800 hover:text-blue-800"
            }`}
          >
            Todos
          </Link>

          {orderStatusOptions.map((status) => (
            <Link
              key={status}
              href={`/admin/pedidos?status=${status}`}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedStatus === status
                  ? "border-blue-800 bg-blue-800 text-white"
                  : "border-slate-300 text-slate-700 hover:border-blue-800 hover:text-blue-800"
              }`}
            >
              {statusLabel[status]} ({countsByStatus[status] ?? 0})
            </Link>
          ))}
        </div>
      </section>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Nenhum pedido encontrado para o filtro selecionado.
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

            const shouldShowPaymentForm =
              canConfirmPix && canConfirmPayment(order.status);

            const shouldShowCancelForm =
              canCancelRelease && canCancelAndReleaseStock(order.status);

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-slate-950">
                          Pedido {order.code}
                        </h3>

                        <OrderStatusBadge status={order.status} />
                      </div>

                      <p className="text-sm text-slate-600">
                        Criado em {formatDateTime(order.createdAt)}
                      </p>

                      <p className="text-sm text-slate-600">
                        Origem:{" "}
                        <strong className="text-slate-900">
                          {order.source}
                        </strong>
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:text-right">
                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Total devido
                        </span>
                        <strong className="text-lg text-slate-950">
                          {formatCurrency(order.totalDueCents)}
                        </strong>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Recebido
                        </span>
                        <strong className="text-lg text-slate-950">
                          {formatCurrency(confirmedPaymentsTotal)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-5">
                    <section className="space-y-3">
                      <h4 className="font-semibold text-slate-950">Cliente</h4>

                      {order.customer ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                          <p>
                            <strong className="text-slate-950">
                              {order.customer.name}
                            </strong>
                          </p>
                          <p>{order.customer.email}</p>
                          <p>{order.customer.phone}</p>
                          <p>Grupo: {order.customer.groupCode}</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                          Pedido sem cliente vinculado. Provável venda PDV para
                          consumidor.
                        </div>
                      )}
                    </section>

                    <section className="space-y-3">
                      <h4 className="font-semibold text-slate-950">Itens</h4>

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
                                  {item.quantity}
                                </td>

                                <td className="px-4 py-3 align-top text-slate-700">
                                  {formatCurrency(item.unitPriceCents)}
                                </td>

                                <td className="px-4 py-3 align-top font-semibold text-slate-950">
                                  {formatCurrency(item.lineTotalCents)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h4 className="font-semibold text-slate-950">
                        Resumo financeiro
                      </h4>

                      <dl className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-600">Subtotal</dt>
                          <dd className="font-semibold text-slate-950">
                            {formatCurrency(order.subtotalCents)}
                          </dd>
                        </div>

                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-600">Desconto aplicado</dt>
                          <dd className="font-semibold text-slate-950">
                            {formatCurrency(order.discountCentsApplied)}
                          </dd>
                        </div>

                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-600">Total devido</dt>
                          <dd className="font-semibold text-slate-950">
                            {formatCurrency(order.totalDueCents)}
                          </dd>
                        </div>

                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-600">Recebido</dt>
                          <dd className="font-semibold text-slate-950">
                            {formatCurrency(confirmedPaymentsTotal)}
                          </dd>
                        </div>

                        <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                          <dt className="font-semibold text-slate-700">
                            Falta receber
                          </dt>
                          <dd className="font-bold text-slate-950">
                            {formatCurrency(remainingAmountCents)}
                          </dd>
                        </div>
                      </dl>

                      {order.discountExpiresAt ? (
                        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                          Desconto válido até{" "}
                          <strong>
                            {formatDateTime(order.discountExpiresAt)}
                          </strong>
                          .
                        </p>
                      ) : null}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h4 className="font-semibold text-slate-950">
                        Pagamentos confirmados
                      </h4>

                      {order.payments.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-600">
                          Nenhum pagamento confirmado até o momento.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {order.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm"
                            >
                              <div className="flex justify-between gap-4">
                                <span className="font-semibold text-slate-950">
                                  {payment.method}
                                </span>
                                <strong className="text-slate-950">
                                  {formatCurrency(payment.receivedAmountCents)}
                                </strong>
                              </div>

                              <p className="mt-1 text-slate-600">
                                Confirmado em{" "}
                                {formatDateTime(payment.confirmedAt)}
                              </p>

                              {payment.notes ? (
                                <p className="mt-2 text-slate-600">
                                  {payment.notes}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {shouldShowCancelForm ? (
                      <form
                        action={cancelOrderAndReleaseStockAction}
                        className="rounded-2xl border border-red-200 bg-red-50 p-4"
                      >
                        <input type="hidden" name="orderId" value={order.id} />

                        <h4 className="font-semibold text-red-950">
                          Cancelar pedido e liberar estoque
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-red-800">
                          Use esta ação somente quando o pedido ainda não teve
                          pagamento confirmado. O estoque reservado será
                          devolvido e o pedido ficará como cancelado.
                        </p>

                        <div className="mt-4 space-y-2">
                          <label
                            className="field-label text-red-950"
                            htmlFor={`reason-${order.id}`}
                          >
                            Motivo do cancelamento
                          </label>

                          <textarea
                            id={`reason-${order.id}`}
                            name="reason"
                            className="field-input min-h-24 bg-white"
                            placeholder="Ex.: comprador desistiu do pedido antes do pagamento."
                          />
                        </div>

                        <button
                          type="submit"
                          className="mt-4 w-full rounded-full bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
                        >
                          Cancelar e liberar estoque
                        </button>
                      </form>
                    ) : null}

                    {canCancelRelease ? null : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        Seu usuário pode visualizar pedidos, mas não possui
                        permissão para cancelar pedidos e liberar estoque.
                      </div>
                    )}

                    {shouldShowPaymentForm ? (
                      <form
                        action={confirmPixPaymentAction}
                        className="rounded-2xl border border-blue-100 bg-blue-50 p-4"
                      >
                        <input type="hidden" name="orderId" value={order.id} />

                        <h4 className="font-semibold text-slate-950">
                          Confirmar PIX manualmente
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Informe o valor que realmente caiu no extrato. Se for
                          menor que o total devido, o pedido ficará como
                          pendente de complemento.
                        </p>

                        <div className="mt-4 space-y-2">
                          <label
                            className="field-label"
                            htmlFor={`receivedAmount-${order.id}`}
                          >
                            Valor recebido
                          </label>

                          <input
                            id={`receivedAmount-${order.id}`}
                            name="receivedAmount"
                            className="field-input bg-white"
                            inputMode="decimal"
                            placeholder="Ex.: 1080,00"
                            required
                          />
                        </div>

                        <div className="mt-4 space-y-2">
                          <label
                            className="field-label"
                            htmlFor={`notes-${order.id}`}
                          >
                            Observação interna
                          </label>

                          <textarea
                            id={`notes-${order.id}`}
                            name="notes"
                            className="field-input min-h-24 bg-white"
                            placeholder="Ex.: comprovante conferido no extrato."
                          />
                        </div>

                        <button
                          type="submit"
                          className="mt-4 w-full rounded-full bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                        >
                          Confirmar pagamento PIX
                        </button>
                      </form>
                    ) : null}

                    {canConfirmPix ? null : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        Seu usuário pode visualizar pedidos, mas não possui
                        permissão para confirmar PIX.
                      </div>
                    )}
                  </aside>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
