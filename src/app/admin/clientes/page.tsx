import type { CustomerStatus } from "@prisma/client";

import {
  approveCustomerAction,
  blockCustomerAction,
  makeCustomerTemporaryAction,
} from "@/app/admin/clientes/actions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<CustomerStatus, string> = {
  PENDING: "Pendente",
  TEMPORARY: "Temporário",
  APPROVED: "Aprovado",
  BLOCKED: "Bloqueado",
};

const statusClasses: Record<CustomerStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  TEMPORARY: "border-blue-200 bg-blue-50 text-blue-800",
  APPROVED: "border-green-200 bg-green-50 text-green-800",
  BLOCKED: "border-red-200 bg-red-50 text-red-800",
};

function formatDate(value: Date | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function maskPhone(value: string): string {
  const digits = value.replaceAll(/\D/g, "");

  if (digits.length < 6) {
    return value;
  }

  return `${digits.slice(0, 2)} *****-${digits.slice(-4)}`;
}

function maskEmail(value: string): string {
  const [name, domain] = value.split("@");

  if (!name || !domain) {
    return value;
  }

  const visibleName = name.length <= 2 ? name[0] : name.slice(0, 2);

  return `${visibleName}***@${domain}`;
}

export default async function AdminCustomersPage() {
  await requirePermission(PERMISSIONS.CUSTOMERS_READ);

  const [customers, counters] = await Promise.all([
    prisma.customer.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        address: true,
        approvedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.customer.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),
  ]);

  const totalByStatus = counters.reduce(
    (acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    },
    {
      PENDING: 0,
      TEMPORARY: 0,
      APPROVED: 0,
      BLOCKED: 0,
    } satisfies Record<CustomerStatus, number>,
  );

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-800">
          Clientes
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Aprovação de clientes
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
          Gerencie cadastros pendentes, libere clientes aprovados, autorize
          cliente temporário para uma compra ou bloqueie cadastros.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(totalByStatus).map(([status, total]) => (
          <article
            key={status}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-600">
              {statusLabels[status as CustomerStatus]}
            </p>
            <strong className="mt-2 block text-3xl text-slate-950">
              {total}
            </strong>
          </article>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 font-semibold text-slate-700">
                  Cliente
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700">
                  Contato
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700">
                  Endereço
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700">
                  Cadastro
                </th>
                <th className="px-5 py-4 font-semibold text-slate-700">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-600"
                  >
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="align-top">
                    <td className="px-5 py-4">
                      <strong className="block text-slate-950">
                        {customer.name}
                      </strong>
                      <span className="mt-1 block text-slate-600">
                        CSA: {customer.csaName ?? "—"}
                      </span>
                      <span className="mt-1 block text-slate-600">
                        Encargo: {customer.charge ?? "—"}
                      </span>
                      <span className="mt-1 block text-slate-600">
                        Grupo: {customer.groupCode}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      <span className="block">{maskEmail(customer.email)}</span>
                      <span className="mt-1 block">
                        {maskPhone(customer.phone)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {customer.address ? (
                        <>
                          <span className="block">
                            {customer.address.street}, {customer.address.number}
                          </span>
                          <span className="mt-1 block">
                            {customer.address.district} —{" "}
                            {customer.address.city}/{customer.address.state}
                          </span>
                          <span className="mt-1 block">
                            CEP: {customer.address.zipCode}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          statusClasses[customer.status]
                        }`}
                      >
                        {statusLabels[customer.status]}
                      </span>

                      {customer.status === "TEMPORARY" ? (
                        <span className="mt-2 block text-xs text-slate-600">
                          Compras restantes:{" "}
                          {customer.temporaryPurchaseRemaining}
                        </span>
                      ) : null}

                      {customer.approvedBy ? (
                        <span className="mt-2 block text-xs text-slate-600">
                          Por: {customer.approvedBy.name}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      <span className="block">
                        Criado: {formatDate(customer.createdAt)}
                      </span>
                      <span className="mt-1 block">
                        Aprovado: {formatDate(customer.approvedAt)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex min-w-44 flex-col gap-2">
                        <form action={approveCustomerAction}>
                          <input
                            type="hidden"
                            name="customerId"
                            value={customer.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full bg-green-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-800"
                          >
                            Aprovar
                          </button>
                        </form>

                        <form action={makeCustomerTemporaryAction}>
                          <input
                            type="hidden"
                            name="customerId"
                            value={customer.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full bg-blue-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-900"
                          >
                            Temporário
                          </button>
                        </form>

                        <form action={blockCustomerAction}>
                          <input
                            type="hidden"
                            name="customerId"
                            value={customer.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:border-red-700 hover:bg-red-50"
                          >
                            Bloquear
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
