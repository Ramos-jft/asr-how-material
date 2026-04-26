import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PasswordResetRequestForm } from "@/app/recuperar-senha/PasswordResetRequestForm";
import { requireGuest } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Recuperar senha | Material ASR HOW Brasil",
  description:
    "Solicite um link para redefinir a senha de acesso do comprador.",
};

export default async function RecuperarSenhaPage() {
  await requireGuest();

  return (
    <main className="page-shell">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="panel space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Recuperação de acesso
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
                Esqueceu sua senha?
              </h1>

              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Solicite um link seguro para criar uma nova senha. O link expira
                em 30 minutos e deixa de funcionar após a senha ser alterada.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            <p>
              Por segurança, não informamos se o e-mail existe ou não na base de
              compradores.
            </p>
          </div>

          <Link className="button-secondary inline-flex" href="/">
            Voltar ao início
          </Link>
        </div>

        <PasswordResetRequestForm />
      </section>
    </main>
  );
}
