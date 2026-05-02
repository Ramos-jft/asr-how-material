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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col items-center text-center">
              <Link
                href="/admin"
                aria-label="Ir para o dashboard administrativo"
                className="relative hidden h-20 w-20 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:block lg:h-24 lg:w-24"
              >
                <Image
                  src="/logo-asr-how.png"
                  alt="Logo ASR HOW Brasil"
                  fill
                  priority
                  sizes="96px"
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

            <div className="relative hidden h-20 w-20 shrink-0 sm:block lg:h-24 lg:w-24">
              <Image
                src="/logo-na.png"
                alt="Logo NA"
                fill
                priority
                sizes="96px"
                className="object-contain"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <nav
              className="flex max-w-full flex-wrap justify-center gap-2 xl:justify-start"
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

            <div className="flex flex-wrap justify-center gap-2 xl:justify-end">
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

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:py-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

          <section className="border-t border-slate-200 pt-5">
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
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
