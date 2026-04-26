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
            Material ASR HOW Brasil
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
              Loja virtual, painel administrativo e PDV
            </h1>

            <p className="max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Acesse o catálogo de materiais, acompanhe seus pedidos ou entre no
              painel administrativo para operar pedidos, estoque, clientes,
              pagamentos e PDV.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/login/comprador" className="button-primary">
              Entrar como comprador
            </Link>

            <Link href="/login/admin" className="button-secondary">
              Entrar como admin
            </Link>

            <Link href="/catalogo" className="button-secondary">
              Ver catálogo
            </Link>
          </div>
        </div>

        <div className="panel space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-950">
              Escolha seu acesso
            </h2>

            <p className="text-sm leading-6 text-slate-600">
              O login é o mesmo sistema seguro, mas cada perfil é direcionado de
              acordo com suas permissões.
            </p>
          </div>

          <div className="grid gap-4">
            <Link
              href="/login/comprador"
              className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 transition hover:border-emerald-400 hover:bg-emerald-100"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Comprador
              </span>

              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Comprar e acompanhar pedidos
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Entre para acessar carrinho, checkout, pagamento PIX e seus
                pedidos.
              </p>
            </Link>

            <Link
              href="/login/admin"
              className="rounded-3xl border border-blue-200 bg-blue-50 p-5 transition hover:border-blue-400 hover:bg-blue-100"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
                Admin
              </span>

              <h3 className="mt-2 text-lg font-semibold text-slate-950">
                Operar loja, pedidos e estoque
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Entre para gerenciar clientes, pedidos, confirmação manual de
                PIX, estoque, produtos e PDV.
              </p>
            </Link>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              Escopo consolidado
            </h2>

            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {highlights.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
