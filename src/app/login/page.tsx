import Image from "next/image";

import { LoginForm } from "@/app/login/LoginForm";
import { requireGuest } from "@/lib/auth/guards";

export const metadata = {
  title: "Login | Material ASR HOW Brasil",
  description: "Acesso ao painel administrativo e operação da loja.",
};

export default async function LoginPage() {
  await requireGuest();

  const shouldShowDevCredentials = process.env.NODE_ENV === "development";

  return (
    <main className="page-shell">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="panel space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Acesso seguro ao sistema
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
                Entre com seu usuário autorizado para acessar as áreas
                administrativas, operacionais e futuras funcionalidades do PDV.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="mini-card">
              <strong className="text-xl font-semibold">Catálogo</strong>
              <span className="text-sm text-slate-600">
                produtos importados da planilha
              </span>
            </article>
            <article className="mini-card">
              <strong className="text-xl font-semibold">RBAC</strong>
              <span className="text-sm text-slate-600">
                perfis e permissões
              </span>
            </article>
            <article className="mini-card">
              <strong className="text-xl font-semibold">PIX</strong>
              <span className="text-sm text-slate-600">
                confirmação manual no admin
              </span>
            </article>
          </div>
        </div>

        <div className="space-y-4">
          <LoginForm />

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