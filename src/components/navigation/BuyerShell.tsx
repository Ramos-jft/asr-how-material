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
    <section className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/catalogo" aria-label="Ir para o catálogo">
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
                Área do comprador
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Material ASR HOW Brasil
              </h1>

              <p className="mt-1 text-sm text-slate-600">{auth.user.name}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <nav
                className="flex flex-wrap gap-2"
                aria-label="Menu do comprador"
              >
                {buyerLinks.map((link) => (
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

      {children}
    </section>
  );
}
