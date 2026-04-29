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

const quickAccessLinks = [
  {
    href: "/catalogo",
    label: "Ver catálogo",
  },
  {
    href: "/cadastro",
    label: "Cadastro comprador",
  },
];

type AdminLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const auth = await requirePermission(PERMISSIONS.DASHBOARD_READ);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" aria-label="Ir para o dashboard administrativo">
              <Image
                src="/brand/logo-asr-how.png"
                alt="Logo ASR HOW Brasil"
                width={144}
                height={48}
                priority
                className="h-auto w-32 sm:w-36"
              />
            </Link>

            <Image
              src="/brand/logo-na.png"
              alt="Logo NA"
              width={72}
              height={72}
              priority
              className="h-14 w-auto sm:h-16"
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-800">
                Material ASR HOW Brasil
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Painel administrativo
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <nav
                className="flex flex-wrap gap-2"
                aria-label="Menu administrativo"
              >
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

              <div className="flex flex-wrap gap-2">
                <BackButton />

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
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <section>
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
          </section>

          <section className="border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Acessos rápidos
            </p>

            <div className="mt-4 grid gap-2">
              {quickAccessLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-800 hover:text-blue-800"
                >
                  {link.label}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    abre em nova aba
                  </span>
                </Link>
              ))}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Catálogo e cadastro são áreas públicas/comprador. Por isso abrem
              em nova aba para preservar o contexto administrativo.
            </p>
          </section>
        </aside>

        <div>{children}</div>
      </div>
    </main>
  );
}
