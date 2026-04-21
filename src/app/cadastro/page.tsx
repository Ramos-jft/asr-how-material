import type { Metadata } from "next";
import Link from "next/link";

import { CadastroForm } from "@/app/cadastro/CadastroForm";

export const metadata: Metadata = {
  title: "Cadastro",
  description: "Cadastro para acesso à loja de materiais da ASR HOW Brasil.",
};

export default function CadastroPage() {
  return (
    <main className="page-shell items-start">
      <section className="grid w-full gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="panel h-fit space-y-6">
          <span className="badge-brand">Cadastro</span>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Solicite acesso à loja
            </h1>

            <p className="text-base leading-7 text-slate-600">
              A compra é restrita a clientes cadastrados e aprovados. Após o
              envio, o administrador analisará o cadastro antes de liberar a
              compra.
            </p>
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            <p>
              <strong className="text-slate-950">Importante:</strong> o cadastro
              não libera a compra automaticamente.
            </p>
            <p>
              Clientes temporários podem ser autorizados manualmente para uma
              compra, conforme regra operacional do projeto.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" href="/catalogo">
              Ver catálogo
            </Link>

            <Link className="button-secondary" href="/login">
              Entrar no painel
            </Link>
          </div>
        </div>

        <CadastroForm />
      </section>
    </main>
  );
}
