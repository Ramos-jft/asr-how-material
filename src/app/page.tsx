import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Material ASR HOW Brasil",
  description:
    "Catálogo de materiais da Material ASR HOW Brasil para clientes cadastrados.",
};

type AccessLinkVariant = "primary" | "secondary" | "outline";

type AccessLink = {
  href: string;
  label: string;
  variant: AccessLinkVariant;
};

const accessLinks: AccessLink[] = [
  {
    href: "/login/comprador",
    label: "Entrar como comprador",
    variant: "primary",
  },
  {
    href: "/login/admin",
    label: "Entrar como admin",
    variant: "secondary",
  },
  {
    href: "/cadastro",
    label: "Solicitar cadastro",
    variant: "outline",
  },
];

const accessLinkClassNames: Record<AccessLinkVariant, string> = {
  primary: "button-primary min-h-12 min-w-44",
  secondary: "button-accent min-h-12 min-w-44",
  outline: "button-outline min-h-12 min-w-44",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-asr-how.png"
            alt="Material ASR HOW Brasil"
            width={168}
            height={168}
            priority
            className="h-auto w-32 sm:w-40"
          />
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-[var(--brand-secondary)]">
          Material ASR HOW Brasil
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Catálogo de materiais para clientes cadastrados
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
          Acesse sua área para consultar materiais, acompanhar pedidos ou
          gerenciar a operação conforme seu perfil de acesso.
        </p>

        <div className="mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {accessLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={accessLinkClassNames[link.variant]}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="mt-8 max-w-xl text-sm leading-6 text-[var(--muted)]">
          O acesso ao catálogo e aos pedidos é restrito a usuários cadastrados e
          autorizados pela administração.
        </p>
      </section>
    </main>
  );
}
