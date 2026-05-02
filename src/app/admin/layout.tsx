import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/actions/logout";
import { BackButton } from "@/components/navigation/BackButton";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

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
    href: "/admin/janela-vendas",
    label: "Janela",
  },
  {
    href: "/admin/pdv",
    label: "PDV",
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios",
  },
];

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const auth = await requirePermission(PERMISSIONS.DASHBOARD_READ);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-end">
          <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
            <Link
              href="/admin"
              aria-label="Ir para o dashboard administrativo"
              className="relative hidden h-24 w-40 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:block lg:h-28 lg:w-44"
            >
              <Image
                src="/logo-asr-how.png"
                alt="Logo ASR HOW Brasil"
                fill
                priority
                sizes="176px"
                className="object-contain"
              />
            </Link>

            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-blue-800">
              Material ASR HOW Brasil
            </p>

            <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-slate-950">
              Painel administrativo
            </h1>
          </div>

          <nav
            className="flex min-w-0 flex-wrap justify-center gap-2 lg:self-end"
            aria-label="Menu administrativo"
          >
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-800 hover:text-blue-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col items-center gap-3 lg:self-end">
            <div className="relative hidden h-16 w-16 sm:block">
              <Image
                src="/logo-na.png"
                alt="Logo NA"
                fill
                priority
                sizes="64px"
                className="object-contain"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <BackButton />

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-red-700 bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-800 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <aside className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <section className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Usuário atual
              </p>

              <h2 className="mt-3 break-words text-lg font-bold text-slate-950">
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
            </section>

            <section className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Acessos rápidos
              </p>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/cadastro"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:border-blue-800 hover:text-blue-800"
                >
                  Cadastro comprador
                </Link>
              </div>
            </section>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
