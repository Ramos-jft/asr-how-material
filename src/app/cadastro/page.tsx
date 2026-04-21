import type { Metadata } from "next";
import Link from "next/link";

import { CadastroForm } from "@/app/cadastro/CadastroForm";

export const metadata: Metadata = {
  title: "Cadastro de cliente",
  description:
    "Cadastro público para solicitar acesso à loja Material ASR HOW Brasil.",
};

export default function CadastroPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-800">
              Cadastro
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Solicitar acesso à loja
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
              Preencha os dados do responsável. A compra é restrita a clientes
              aprovados manualmente ou liberados temporariamente para uma
              compra.
            </p>
          </div>

          <Link
            href="/catalogo"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-800 hover:text-blue-800"
          >
            Ver catálogo
          </Link>
        </div>

        <CadastroForm />
      </div>
    </main>
  );
}
