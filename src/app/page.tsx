import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Material ASR HOW Brasil",
  description:
    "Catálogo de materiais da ASR HOW Brasil para clientes cadastrados.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-asr-how.png"
            alt="Material ASR HOW Brasil"
            width={180}
            height={180}
            priority
            className="h-auto w-36 sm:w-44"
          />
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-blue-700">
          Material ASR HOW Brasil
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Catálogo de materiais para clientes cadastrados
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
          Acesse sua conta para consultar materiais disponíveis, montar seu
          pedido e acompanhar suas solicitações.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            Entrar
          </Link>

          <Link
            href="/cadastro"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-blue-700 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            Solicitar cadastro
          </Link>
        </div>

        <p className="mt-8 max-w-xl text-sm leading-6 text-slate-500">
          O acesso ao catálogo e aos pedidos é restrito a usuários cadastrados e
          autorizados pela administração.
        </p>
      </section>
    </main>
  );
}
