import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/app/login/LoginForm";
import { requireGuestForLoginIntent } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Entrar como comprador | Material ASR HOW Brasil",
  description:
    "Acesso de compradores aprovados ao catálogo, carrinho, checkout e pedidos.",
};

type BuyerLoginPageProps = Readonly<{
  searchParams?: Promise<{
    sucesso?: string;
    erro?: string;
  }>;
}>;

function AlertMessage({
  type,
  message,
}: Readonly<{
  type: "success" | "error";
  message?: string;
}>) {
  if (!message) return null;

  const className =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-3 text-sm ${className}`}
    >
      {message}
    </div>
  );
}

export default async function BuyerLoginPage({
  searchParams,
}: BuyerLoginPageProps) {
  await requireGuestForLoginIntent("buyer");

  const params = await searchParams;

  return (
    <main className="page-shell">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="panel space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Área do comprador
          </div>

          <div className="space-y-4">
            <Image
              src="/logo-asr-how.png"
              alt="Logo ASR HOW Brasil"
              width={168}
              height={56}
              priority
            />

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Entrar como comprador
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Use esta entrada somente para catálogo, carrinho, checkout,
                pagamento e acompanhamento dos seus pedidos.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="mini-card">
              <strong className="text-xl font-semibold">Catálogo</strong>
              <span className="text-sm text-slate-600">
                materiais disponíveis
              </span>
            </article>

            <article className="mini-card">
              <strong className="text-xl font-semibold">PIX</strong>
              <span className="text-sm text-slate-600">
                instruções de pagamento
              </span>
            </article>

            <article className="mini-card">
              <strong className="text-xl font-semibold">Pedidos</strong>
              <span className="text-sm text-slate-600">
                acompanhamento do status
              </span>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" href="/">
              Voltar ao início
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <AlertMessage type="success" message={params?.sucesso} />
          <AlertMessage type="error" message={params?.erro} />

          <LoginForm
            title="Acesso do comprador"
            description="Entre com seu usuário de comprador cadastrado e aprovado."
            submitLabel="Entrar como comprador"
            pendingLabel="Entrando..."
            emailPlaceholder="comprador@email.com"
            loginIntent="buyer"
          />

          <div className="panel panel-tight text-center text-sm leading-6 text-slate-600">
            <p>Não lembra sua senha?</p>

            <Link
              className="font-semibold text-blue-800 underline-offset-4 hover:underline"
              href="/recuperar-senha"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
