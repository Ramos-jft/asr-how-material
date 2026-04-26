import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/app/login/LoginForm";
import { requireGuest } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Entrar como admin | Material ASR HOW Brasil",
  description:
    "Acesso administrativo para gestão da loja, pedidos, clientes, estoque e PDV.",
};

export default async function AdminLoginPage() {
  await requireGuest();

  const shouldShowDevCredentials = process.env.NODE_ENV === "development";

  return (
    <main className="page-shell">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="panel space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            Área administrativa
          </div>

          <div className="space-y-4">
            <Image
              src="/brand/logo-asr-how.png"
              alt="Logo ASR HOW Brasil"
              width={168}
              height={56}
              priority
            />

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Entrar como admin
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Use esta entrada para acessar painel administrativo, pedidos,
                clientes, produtos, estoque, confirmação manual de PIX e PDV.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="mini-card">
              <strong className="text-xl font-semibold">Pedidos</strong>
              <span className="text-sm text-slate-600">
                confirmação manual de PIX
              </span>
            </article>

            <article className="mini-card">
              <strong className="text-xl font-semibold">Estoque</strong>
              <span className="text-sm text-slate-600">
                reserva e movimentações
              </span>
            </article>

            <article className="mini-card">
              <strong className="text-xl font-semibold">PDV</strong>
              <span className="text-sm text-slate-600">
                operação em eventos
              </span>
            </article>
          </div>

          <Link className="button-secondary inline-flex" href="/">
            Voltar ao início
          </Link>
        </div>

        <div className="space-y-4">
          <LoginForm
            title="Acesso administrativo"
            description="Entre com um usuário autorizado. O sistema validará permissões no servidor."
            submitLabel="Entrar como admin"
            pendingLabel="Entrando..."
            emailPlaceholder="admin@materialasr.local"
          />

          {shouldShowDevCredentials ? (
            <div className="panel panel-tight text-sm leading-6 text-slate-600">
              <p>
                <strong>Usuário inicial do seed:</strong>{" "}
                admin@materialasr.local
              </p>
              <p>
                <strong>Senha inicial do seed:</strong> Admin@123456
              </p>
              <p className="text-xs text-slate-500">
                Visível apenas em desenvolvimento. Troque essa senha antes de
                qualquer homologação externa.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
