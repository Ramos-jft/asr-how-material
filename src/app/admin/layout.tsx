import Link from "next/link";

import { logoutAction } from "@/app/actions/logout";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/guards";

const adminLinks = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
  },
  {
    href: "/admin/produtos",
    label: "Produtos",
  },
  {
    href: "/admin/estoque",
    label: "Estoque",
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
  },
  {
    href: "/admin/pdv",
    label: "PDV",
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios",
  },
  {
    href: "/cadastro",
    label: "Cadastro",
  },
  {
    href: "/catalogo",
    label: "Catálogo",
  },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await requirePermission(PERMISSIONS.DASHBOARD_READ);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-800">
              Material ASR HOW Brasil
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Painel administrativo
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex flex-wrap gap-2">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-800 hover:text-blue-800"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Usuário atual
          </p>

          <h2 className="mt-3 text-lg font-bold text-slate-950">
            {auth.user.name}
          </h2>

          <p className="mt-1 break-all text-sm text-slate-600">
            {auth.user.email}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {auth.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
              >
                {role}
              </span>
            ))}
          </div>
        </aside>

        <div>{children}</div>
      </div>
    </main>
  );
}
