import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/actions/logout";
import { BackButton } from "@/components/navigation/BackButton";
import { requireBuyerAccess } from "@/lib/auth/guards";

const buyerLinks = [
  {
    href: "/catalogo",
    label: "Catálogo",
  },
  {
    href: "/carrinho",
    label: "Carrinho",
  },
  {
    href: "/checkout",
    label: "Checkout",
  },
  {
    href: "/pedidos",
    label: "Meus pedidos",
  },
  {
    href: "/minha-conta",
    label: "Minha conta",
  },
];

type BuyerShellProps = Readonly<{
  children: ReactNode;
}>;

export default async function BuyerShell({ children }: BuyerShellProps) {
  const auth = await requireBuyerAccess();

  return (
    <section className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_180px] lg:items-end">
          <div className="flex min-w-0 justify-center lg:justify-start">
            <Link
              href="/catalogo"
              aria-label="Ir para o catálogo"
              className="flex min-w-0 flex-col items-center gap-3 rounded-2xl text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 lg:items-start lg:text-left"
            >
              <span className="relative h-14 w-20 shrink-0 sm:h-16 sm:w-24 lg:h-20 lg:w-28">
                <Image
                  src="/brand/logo-asr-how.png"
                  alt="Logo ASR HOW Brasil"
                  fill
                  priority
                  sizes="112px"
                  className="object-contain"
                />
              </span>

              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-blue-800 sm:text-sm sm:tracking-[0.3em]">
                  Área do comprador
                </span>

                <span className="mt-1 block text-2xl font-bold tracking-tight text-slate-950 lg:whitespace-nowrap">
                  Material ASR HOW Brasil
                </span>

                <span className="mt-1 block max-w-[220px] truncate text-sm text-slate-600 sm:max-w-[280px]">
                  {auth.user.name}
                </span>
              </span>
            </Link>
          </div>

          <nav
            className="flex min-w-0 flex-wrap justify-center gap-2 lg:self-end"
            aria-label="Menu do comprador"
          >
            {buyerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-800 hover:text-blue-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col items-center justify-center gap-3 lg:self-end">
            <div className="relative hidden h-16 w-16 sm:block">
              <Image
                src="/brand/logo-na.png"
                alt="Logo NA"
                fill
                priority
                sizes="64px"
                className="object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
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

      {children}
    </section>
  );
}
