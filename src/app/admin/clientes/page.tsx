import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CustomerStatus } from "@prisma/client";

import {
  approveCustomerAction,
  blockCustomerAction,
  makeCustomerTemporaryAction,
} from "@/app/admin/clientes/actions";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clientes",
  description: "Listagem administrativa de clientes cadastrados.",
};

const statusLabel: Record<CustomerStatus, string> = {
  PENDING: "Pendente",
  TEMPORARY: "Temporário",
  APPROVED: "Aprovado",
  BLOCKED: "Bloqueado",
};

const statusClassName: Record<CustomerStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  TEMPORARY: "border-blue-200 bg-blue-50 text-blue-800",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  BLOCKED: "border-red-200 bg-red-50 text-red-800",
};

type CustomerActionButtonVariant = "primary" | "secondary" | "danger";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getCustomerActionButtonClassName(
  variant: CustomerActionButtonVariant,
): string {
  const baseClassName =
    "rounded-full px-3 py-2 text-xs font-semibold transition";

  switch (variant) {
    case "primary":
      return `${baseClassName} bg-blue-800 text-white hover:bg-blue-900`;

    case "danger":
      return `${baseClassName} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`;

    case "secondary":
      return `${baseClassName} border border-slate-300 bg-white text-slate-700 hover:border-blue-800 hover:text-blue-800`;

    default:
      return `${baseClassName} border border-slate-300 bg-white text-slate-700 hover:border-blue-800 hover:text-blue-800`;
  }
}

function canApproveCustomer(status: CustomerStatus): boolean {
  return status !== CustomerStatus.APPROVED;
}

function canMakeCustomerTemporary(status: CustomerStatus): boolean {
  return status !== CustomerStatus.TEMPORARY;
}

function canBlockCustomer(status: CustomerStatus): boolean {
  return status !== CustomerStatus.BLOCKED;
}

function CustomerStatusBadge({ status }: Readonly<{ status: CustomerStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

function CustomerActionButton({
  children,
  variant = "secondary",
}: Readonly<{
  children: ReactNode;
  variant?: CustomerActionButtonVariant;
}>) {
  return (
    <button type="submit" className={getCustomerActionButtonClassName(variant)}>
      {children}
    </button>
  );
}

export default async function AdminClientesPage() {
  await requirePermission(PERMISSIONS.CUSTOMERS_READ);

  const customers = await prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      address: {
        select: {
          city: true,
          state: true,
        },
      },
    },
  });

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">Clientes</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Cadastros recebidos
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Gerencie os cadastros recebidos, aprove clientes, libere uma compra
            temporária ou bloqueie acessos quando necessário.
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {customers.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            Nenhum cliente cadastrado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Cliente
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Contato
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Grupo
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Cidade
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Cadastro
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-slate-950">
                        {customer.name}
                      </p>

                      {customer.csaName ? (
                        <p className="mt-1 text-slate-500">
                          {customer.csaName}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <p className="text-slate-950">{customer.email}</p>
                      <p className="mt-1 text-slate-500">{customer.phone}</p>
                    </td>

                    <td className="px-5 py-4 align-top text-slate-700">
                      {customer.groupCode}
                    </td>

                    <td className="px-5 py-4 align-top text-slate-700">
                      {customer.address
                        ? `${customer.address.city}/${customer.address.state}`
                        : "Não informado"}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <CustomerStatusBadge status={customer.status} />
                    </td>

                    <td className="px-5 py-4 align-top text-slate-600">
                      {formatDateTime(customer.createdAt)}
                    </td>

                    <td className="px-5 py-4 align-top">
                      <div className="flex min-w-56 flex-wrap gap-2">
                        {canApproveCustomer(customer.status) ? (
                          <form action={approveCustomerAction}>
                            <input
                              type="hidden"
                              name="customerId"
                              value={customer.id}
                            />

                            <CustomerActionButton variant="primary">
                              Aprovar
                            </CustomerActionButton>
                          </form>
                        ) : null}

                        {canMakeCustomerTemporary(customer.status) ? (
                          <form action={makeCustomerTemporaryAction}>
                            <input
                              type="hidden"
                              name="customerId"
                              value={customer.id}
                            />

                            <CustomerActionButton>
                              Temporário
                            </CustomerActionButton>
                          </form>
                        ) : null}

                        {canBlockCustomer(customer.status) ? (
                          <form action={blockCustomerAction}>
                            <input
                              type="hidden"
                              name="customerId"
                              value={customer.id}
                            />

                            <CustomerActionButton variant="danger">
                              Bloquear
                            </CustomerActionButton>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
