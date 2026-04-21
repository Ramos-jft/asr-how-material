import type { Metadata } from "next";
import { CustomerStatus } from "@prisma/client";

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
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  TEMPORARY: "bg-blue-50 text-blue-800 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  BLOCKED: "bg-red-50 text-red-800 border-red-200",
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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
            Primeira versão da tela administrativa de clientes. A próxima etapa
            é adicionar ações de aprovação, bloqueio e autorização temporária.
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
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[customer.status]}`}
                      >
                        {statusLabel[customer.status]}
                      </span>
                    </td>

                    <td className="px-5 py-4 align-top text-slate-600">
                      {formatDateTime(customer.createdAt)}
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
