import Image from "next/image";

import { LoginForm } from "@/app/login/LoginForm";
import { requireGuest } from "@/lib/auth/guards";

export const metadata = {
  title: "Login | Material ASR HOW Brasil",
  description: "Acesso ao painel administrativo e operação da loja.",
};

export default async function LoginPage() {
  await requireGuest();

  return (
    <main className="page-shell">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="panel space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Etapa 2 em andamento: autenticação + base do painel
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
                Acesso ao sistema da loja, admin e PDV
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Esta base já contempla o modelo de dados para clientes aprovados,
                catálogo, reserva de estoque antes do PIX, pedidos com desconto e
                operação de PDV. Agora o projeto já possui porta de entrada segura
                para a área administrativa.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="mini-card">
              <strong className="text-xl font-semibold">415</strong>
              <span className="text-sm text-slate-600">produtos na importação inicial</span>
            </article>
            <article className="mini-card">
              <strong className="text-xl font-semibold">5</strong>
              <span className="text-sm text-slate-600">perfis RBAC previstos</span>
            </article>
            <article className="mini-card">
              <strong className="text-xl font-semibold">7 dias</strong>
              <span className="text-sm text-slate-600">prazo do PIX com desconto</span>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <LoginForm />
          <div className="panel panel-tight text-sm leading-6 text-slate-600">
            <p>
              <strong>Usuário inicial do seed:</strong> admin@materialasr.local
            </p>
            <p>
              <strong>Senha inicial do seed:</strong> Admin@123456
            </p>
            <p className="text-xs text-slate-500">
              Troque essa senha assim que a área de gestão de usuários for criada.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
