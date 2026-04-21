import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Material ASR HOW Brasil",
  description:
    "Loja restrita a clientes aprovados, com admin, PDV, PIX manual e controle de estoque.",
};

const highlights = [
  "Venda restrita a clientes cadastrados e aprovados",
  "Reserva de estoque antes da confirmação do PIX",
  "Pedido mínimo de R$ 300,00 e desconto de 10% acima de R$ 1.000,00",
  "PDV para eventos com venda direta e auditoria operacional",
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Projeto em implementação contínua
          </div>

          <div className="space-y-4">
            <Image
              src="/brand/logo-asr-how.png"
              alt="Logo ASR HOW Brasil"
              width={188}
              height={64}
              priority
            />

            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Base inicial da loja virtual, painel administrativo e PDV
            </h1>
            <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Esta aplicação está sendo construída para centralizar pedidos,
              estoque, relatórios e operação de venda da Material ASR HOW Brasil,
              com fluxo restrito para clientes aprovados e confirmação manual de PIX.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/catalogo" className="button-primary">
              Ver catálogo
            </Link>
            <Link href="/login" className="button-secondary">
              Entrar no painel
            </Link>
            <Link href="/admin" className="button-secondary">
              Ver dashboard
            </Link>
          </div>
        </div>

        <div className="panel space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Escopo já consolidado</h2>
          <ul className="space-y-3 text-sm leading-7 text-slate-600">
            {highlights.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
