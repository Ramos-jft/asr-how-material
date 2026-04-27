import type { Metadata } from "next";
import { StoreWindowStatus } from "@prisma/client";

import {
  closeStoreWindowAction,
  createStoreWindowAction,
  openStoreWindowAction,
} from "@/app/admin/janela-vendas/actions";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Janela de vendas",
  description: "Configuração do período em que o checkout fica liberado.",
};

type SalesWindowPageProps = Readonly<{
  searchParams?: Promise<{
    sucesso?: string;
    erro?: string;
  }>;
}>;

const statusLabels = {
  [StoreWindowStatus.SCHEDULED]: "Agendada",
  [StoreWindowStatus.OPEN]: "Aberta",
  [StoreWindowStatus.CLOSED]: "Fechada",
} satisfies Record<StoreWindowStatus, string>;

const statusClassNames = {
  [StoreWindowStatus.SCHEDULED]: "border-blue-200 bg-blue-50 text-blue-800",
  [StoreWindowStatus.OPEN]: "border-emerald-200 bg-emerald-50 text-emerald-800",
  [StoreWindowStatus.CLOSED]: "border-slate-200 bg-slate-100 text-slate-700",
} satisfies Record<StoreWindowStatus, string>;

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateTimeInputValue(date: Date): string {
  const offsetInMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offsetInMs);

  return localDate.toISOString().slice(0, 16);
}

function AlertMessage({
  type,
  message,
}: Readonly<{
  type: "success" | "error";
  message?: string;
}>) {
  if (!message) return null;

  const className =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-3 text-sm ${className}`}
    >
      {message}
    </div>
  );
}

function StoreWindowStatusBadge({
  status,
}: Readonly<{ status: StoreWindowStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassNames[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function canOpenStoreWindow(status: StoreWindowStatus): boolean {
  return status !== StoreWindowStatus.OPEN;
}

function canCloseStoreWindow(status: StoreWindowStatus): boolean {
  return status === StoreWindowStatus.OPEN;
}

export default async function SalesWindowPage({
  searchParams,
}: SalesWindowPageProps) {
  await requirePermission(PERMISSIONS.STORE_WINDOW_MANAGE);

  const params = await searchParams;
  const now = new Date();

  const defaultStartsAt = formatDateTimeInputValue(now);
  const defaultEndsAt = formatDateTimeInputValue(
    new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
  );

  const storeWindows = await prisma.storeWindow.findMany({
    orderBy: {
      startsAt: "desc",
    },
    take: 20,
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  const activeWindow = storeWindows.find(
    (window) =>
      window.status === StoreWindowStatus.OPEN &&
      window.startsAt <= now &&
      window.endsAt >= now,
  );

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">Janela de vendas</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Controle de abertura da loja
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Configure o período em que o checkout fica liberado. O catálogo
            continua visível fora da janela, mas o comprador não consegue criar
            pedido.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <AlertMessage type="success" message={params?.sucesso} />
        <AlertMessage type="error" message={params?.erro} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">Status atual</h3>

        {activeWindow ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            A loja está aberta para checkout até{" "}
            <strong>{formatDateTime(activeWindow.endsAt)}</strong>.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            A loja está fechada para checkout neste momento. O catálogo segue
            disponível como vitrine.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Criar nova janela
        </h3>

        <form
          action={createStoreWindowAction}
          className="mt-5 grid gap-4 lg:grid-cols-2"
        >
          <div className="space-y-2">
            <label className="field-label" htmlFor="startsAt">
              Início
            </label>

            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              className="field-input"
              defaultValue={defaultStartsAt}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="endsAt">
              Fim
            </label>

            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              className="field-input"
              defaultValue={defaultEndsAt}
              required
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="field-label" htmlFor="message">
              Mensagem para loja fechada
            </label>

            <textarea
              id="message"
              name="message"
              className="field-input min-h-24"
              placeholder="Ex.: A loja está fora do período de vendas. Em breve abriremos uma nova janela."
            />
          </div>

          <div className="lg:col-span-2">
            <button type="submit" className="button-primary">
              Criar janela
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Janelas cadastradas
        </h3>

        {storeWindows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Nenhuma janela de vendas cadastrada.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Período
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Mensagem
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {storeWindows.map((storeWindow) => (
                  <tr key={storeWindow.id}>
                    <td className="px-4 py-3 align-top text-slate-700">
                      <p>
                        <strong>Início:</strong>{" "}
                        {formatDateTime(storeWindow.startsAt)}
                      </p>
                      <p className="mt-1">
                        <strong>Fim:</strong>{" "}
                        {formatDateTime(storeWindow.endsAt)}
                      </p>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <StoreWindowStatusBadge status={storeWindow.status} />
                    </td>

                    <td className="px-4 py-3 align-top text-slate-700">
                      {storeWindow._count.orders}
                    </td>

                    <td className="max-w-sm px-4 py-3 align-top text-slate-600">
                      {storeWindow.message || "Não informada"}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        {canOpenStoreWindow(storeWindow.status) ? (
                          <form action={openStoreWindowAction}>
                            <input
                              type="hidden"
                              name="storeWindowId"
                              value={storeWindow.id}
                            />

                            <button
                              type="submit"
                              className="rounded-full bg-blue-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-900"
                            >
                              Abrir
                            </button>
                          </form>
                        ) : null}

                        {canCloseStoreWindow(storeWindow.status) ? (
                          <form action={closeStoreWindowAction}>
                            <input
                              type="hidden"
                              name="storeWindowId"
                              value={storeWindow.id}
                            />

                            <button
                              type="submit"
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              Fechar
                            </button>
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
      </section>
    </section>
  );
}
