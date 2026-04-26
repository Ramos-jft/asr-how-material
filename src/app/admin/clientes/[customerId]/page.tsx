import type { Metadata } from "next";
import Link from "next/link";
import {
  CustomerStatus,
  NotificationStatus,
  OrderStatus,
  PaymentStatus,
  UserStatus,
  type Prisma,
} from "@prisma/client";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatCurrencyFromCents, formatInteger } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detalhes do comprador",
  description:
    "Visão administrativa somente leitura dos dados cadastrais do comprador.",
};

type AdminCustomerDetailPageProps = Readonly<{
  params: Promise<{
    customerId: string;
  }>;
}>;

const customerStatusLabels = {
  [CustomerStatus.PENDING]: "Pendente",
  [CustomerStatus.TEMPORARY]: "Temporário",
  [CustomerStatus.APPROVED]: "Aprovado",
  [CustomerStatus.BLOCKED]: "Bloqueado",
} satisfies Record<CustomerStatus, string>;

const customerStatusClassNames = {
  [CustomerStatus.PENDING]: "border-amber-200 bg-amber-50 text-amber-800",
  [CustomerStatus.TEMPORARY]: "border-blue-200 bg-blue-50 text-blue-800",
  [CustomerStatus.APPROVED]:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  [CustomerStatus.BLOCKED]: "border-red-200 bg-red-50 text-red-800",
} satisfies Record<CustomerStatus, string>;

const userStatusLabels = {
  [UserStatus.ACTIVE]: "Ativo",
  [UserStatus.INACTIVE]: "Inativo",
} satisfies Record<UserStatus, string>;

const orderStatusLabels = {
  [OrderStatus.AWAITING_PAYMENT]: "Aguardando pagamento",
  [OrderStatus.PENDING_COMPLEMENT]: "Pendente complemento",
  [OrderStatus.PAID_CONFIRMED]: "Pago confirmado",
  [OrderStatus.SHIPPED]: "Enviado",
  [OrderStatus.COMPLETED]: "Concluído",
  [OrderStatus.CANCELLED]: "Cancelado",
} satisfies Record<OrderStatus, string>;

const notificationStatusLabels = {
  [NotificationStatus.PENDING]: "Pendente",
  [NotificationStatus.SENT]: "Enviada",
  [NotificationStatus.FAILED]: "Falhou",
} satisfies Record<NotificationStatus, string>;

function formatDateTime(date: Date | null): string {
  if (!date) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatOptional(value: string | null | undefined): string {
  return value?.trim() || "Não informado";
}

function CustomerStatusBadge({ status }: Readonly<{ status: CustomerStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${customerStatusClassNames[status]}`}
    >
      {customerStatusLabels[status]}
    </span>
  );
}

function SectionCard({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>

        {description ? (
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function DataGrid({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <dl className="grid gap-4 text-sm sm:grid-cols-2">{children}</dl>;
}

function DataItem({
  label,
  value,
}: Readonly<{
  label: string;
  value: React.ReactNode;
}>) {
  return (
    <div>
      <dt className="font-medium text-slate-950">{label}</dt>
      <dd className="mt-1 break-words text-slate-600">{value}</dd>
    </div>
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

export default async function AdminCustomerDetailPage({
  params,
}: AdminCustomerDetailPageProps) {
  await requirePermission(PERMISSIONS.CUSTOMERS_READ);

  const { customerId } = await params;

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
      approvedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      address: true,
      orders: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
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
              confirmedAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      notifications: {
        select: {
          id: true,
          channel: true,
          templateKey: true,
          status: true,
          recipient: true,
          errorMessage: true,
          sentAt: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const auditTargets: Prisma.AuditLogWhereInput[] = [
    {
      entity: "Customer",
      entityId: customer.id,
    },
  ];

  if (customer.userId) {
    auditTargets.push({
      entity: "User",
      entityId: customer.userId,
    });
  }

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: auditTargets,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 15,
    select: {
      id: true,
      action: true,
      entity: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const roles = customer.user?.roles.map((item) => item.role.name) ?? [];

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span className="badge-brand">Comprador</span>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  {customer.name}
                </h1>

                <CustomerStatusBadge status={customer.status} />
              </div>

              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Visão administrativa somente leitura. O admin pode consultar os
                dados do comprador, mas não altera cadastro, endereço, e-mail ou
                senha nesta tela.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" href="/admin/clientes">
              Voltar para clientes
            </Link>

            <Link className="button-secondary" href="/admin/pedidos">
              Ver pedidos
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <SectionCard
            title="Dados cadastrais"
            description="Informações declaradas pelo comprador no cadastro."
          >
            <DataGrid>
              <DataItem label="Nome completo" value={customer.name} />
              <DataItem
                label="Nome CSA"
                value={formatOptional(customer.csaName)}
              />
              <DataItem
                label="Encargo"
                value={formatOptional(customer.charge)}
              />
              <DataItem label="Telefone / WhatsApp" value={customer.phone} />
              <DataItem label="E-mail" value={customer.email} />
              <DataItem label="Grupo / unidade" value={customer.groupCode} />
              <DataItem
                label="Status"
                value={customerStatusLabels[customer.status]}
              />
              <DataItem
                label="Compras temporárias restantes"
                value={formatInteger(customer.temporaryPurchaseRemaining)}
              />
              <DataItem
                label="Criado em"
                value={formatDateTime(customer.createdAt)}
              />
              <DataItem
                label="Atualizado em"
                value={formatDateTime(customer.updatedAt)}
              />
              <DataItem
                label="Aprovado em"
                value={formatDateTime(customer.approvedAt)}
              />
              <DataItem
                label="Aprovado por"
                value={
                  customer.approvedBy
                    ? `${customer.approvedBy.name} (${customer.approvedBy.email})`
                    : "Não informado"
                }
              />
            </DataGrid>
          </SectionCard>

          <SectionCard
            title="Endereço"
            description="Endereço usado no checkout e separação de pedidos."
          >
            {customer.address ? (
              <DataGrid>
                <DataItem label="CEP" value={customer.address.zipCode} />
                <DataItem label="UF" value={customer.address.state} />
                <DataItem label="Cidade" value={customer.address.city} />
                <DataItem label="Bairro" value={customer.address.district} />
                <DataItem label="Endereço" value={customer.address.street} />
                <DataItem label="Número" value={customer.address.number} />
                <DataItem
                  label="Complemento"
                  value={formatOptional(customer.address.complement)}
                />
                <DataItem
                  label="Referência"
                  value={formatOptional(customer.address.reference)}
                />
              </DataGrid>
            ) : (
              <p className="text-sm text-slate-600">Endereço não cadastrado.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Pedidos recentes"
            description="Últimos 20 pedidos vinculados ao comprador."
          >
            {customer.orders.length === 0 ? (
              <p className="text-sm text-slate-600">
                Nenhum pedido encontrado para este comprador.
              </p>
            ) : (
              <div className="space-y-4">
                {customer.orders.map((order) => {
                  const confirmedPaymentsTotal = getConfirmedPaymentsTotal(
                    order.payments,
                  );

                  const remainingAmountCents = Math.max(
                    0,
                    order.totalDueCents - confirmedPaymentsTotal,
                  );

                  return (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      key={order.id}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <Link
                            className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                            href={`/pagamento/${order.code}`}
                          >
                            Pedido {order.code}
                          </Link>

                          <p className="text-sm text-slate-600">
                            {orderStatusLabels[order.status]} ·{" "}
                            {formatDateTime(order.createdAt)}
                          </p>

                          <p className="text-sm text-slate-600">
                            Origem: {order.source}
                          </p>
                        </div>

                        <div className="text-sm lg:text-right">
                          <p className="font-semibold text-slate-950">
                            Total:{" "}
                            {formatCurrencyFromCents(order.totalDueCents)}
                          </p>

                          <p className="text-slate-600">
                            Recebido:{" "}
                            {formatCurrencyFromCents(confirmedPaymentsTotal)}
                          </p>

                          <p className="text-slate-600">
                            Falta:{" "}
                            {formatCurrencyFromCents(remainingAmountCents)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
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
                                Total
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3 align-top">
                                  <p className="font-semibold text-slate-950">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    SKU: {item.sku}
                                  </p>
                                </td>

                                <td className="px-4 py-3 align-top text-slate-700">
                                  {formatInteger(item.quantity)}
                                </td>

                                <td className="px-4 py-3 align-top font-semibold text-slate-950">
                                  {formatCurrencyFromCents(item.lineTotalCents)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard
            title="Dados de acesso"
            description="Informações de login visíveis ao admin, sem senha ou hash."
          >
            <DataGrid>
              <DataItem
                label="Usuário vinculado"
                value={customer.user ? "Sim" : "Não"}
              />
              <DataItem
                label="Nome do usuário"
                value={customer.user?.name ?? "Não informado"}
              />
              <DataItem
                label="E-mail de login"
                value={customer.user?.email ?? "Não informado"}
              />
              <DataItem
                label="Status do usuário"
                value={
                  customer.user
                    ? userStatusLabels[customer.user.status]
                    : "Não informado"
                }
              />
              <DataItem
                label="Último login"
                value={formatDateTime(customer.user?.lastLoginAt ?? null)}
              />
              <DataItem
                label="Roles"
                value={roles.length > 0 ? roles.join(", ") : "Não informado"}
              />
            </DataGrid>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Senha não exibida. O sistema armazena somente o hash criptográfico
              da senha, e ele não é mostrado nesta tela.
            </div>
          </SectionCard>

          <SectionCard
            title="Notificações"
            description="Últimas 10 notificações vinculadas ao comprador."
          >
            {customer.notifications.length === 0 ? (
              <p className="text-sm text-slate-600">
                Nenhuma notificação encontrada.
              </p>
            ) : (
              <div className="space-y-3">
                {customer.notifications.map((notification) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                    key={notification.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {notification.templateKey}
                        </p>
                        <p className="text-slate-600">
                          {notification.channel} ·{" "}
                          {notificationStatusLabels[notification.status]}
                        </p>
                      </div>

                      <span className="text-xs text-slate-500">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-slate-600">
                      Destinatário: {notification.recipient}
                    </p>

                    {notification.errorMessage ? (
                      <p className="mt-2 text-red-700">
                        Erro: {notification.errorMessage}
                      </p>
                    ) : null}

                    {notification.sentAt ? (
                      <p className="mt-2 text-slate-600">
                        Enviada em {formatDateTime(notification.sentAt)}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Histórico básico"
            description="Últimos registros de auditoria do comprador/usuário."
          >
            {auditLogs.length === 0 ? (
              <p className="text-sm text-slate-600">
                Nenhum registro de auditoria encontrado.
              </p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                    key={log.id}
                  >
                    <p className="font-semibold text-slate-950">{log.action}</p>

                    <p className="mt-1 text-slate-600">
                      Entidade: {log.entity}
                    </p>

                    <p className="mt-1 text-slate-600">
                      Data: {formatDateTime(log.createdAt)}
                    </p>

                    <p className="mt-1 text-slate-600">
                      Usuário:{" "}
                      {log.user
                        ? `${log.user.name} (${log.user.email})`
                        : "Sistema"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </aside>
      </div>
    </section>
  );
}
