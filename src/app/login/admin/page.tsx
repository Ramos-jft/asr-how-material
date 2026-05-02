import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/app/login/LoginForm";
import { requireGuestForLoginIntent } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Entrar como admin | Material ASR HOW Brasil",
  description:
    "Acesso administrativo para gestão da loja, pedidos, clientes, estoque e PDV.",
};

const adminFeatures = [
  {
    title: "Pedidos",
    description: "Confirmação manual de PIX.",
  },
  {
    title: "Estoque",
    description: "Reserva e movimentações.",
  },
  {
    title: "PDV",
    description: "Operação em eventos.",
  },
];

export default async function AdminLoginPage() {
  await requireGuestForLoginIntent("admin");

  return (
    <main className="page-shell">
      <section className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="panel space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            Área administrativa
          </div>

          <div className="space-y-5">
            <Image
              src="/logo-asr-how.png"
              alt="Logo ASR HOW Brasil"
              width={192}
              height={96}
              priority
              className="h-auto w-40 sm:w-48"
            />

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Entrar como admin
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Use esta entrada somente para painel administrativo, pedidos,
                clientes, produtos, estoque, confirmação manual de PIX e PDV.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {adminFeatures.map((feature) => (
              <article
                key={feature.title}
                className="mini-card flex flex-col gap-2"
              >
                <strong className="block text-xl font-semibold leading-tight text-slate-950">
                  {feature.title}
                </strong>

                <span className="block text-sm leading-6 text-slate-600">
                  {feature.description}
                </span>
              </article>
            ))}
          </div>

          <Link className="button-secondary inline-flex sm:w-fit" href="/">
            Voltar ao início
          </Link>
        </div>

        <LoginForm
          title="Acesso administrativo"
          description="Entre com um usuário autorizado. Compradores não acessam esta área."
          submitLabel="Entrar como admin"
          pendingLabel="Entrando..."
          loginIntent="admin"
        />
      </section>
    </main>
  );
}
