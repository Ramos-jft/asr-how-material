import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatCurrencyFromCents, formatInteger } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

type ProductDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
      status: {
        not: "INACTIVE",
      },
    },
    include: {
      category: { select: { name: true, slug: true } },
      subcategory: { select: { name: true, slug: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Produto não encontrado",
    };
  }

  return {
    title: product.name,
    description:
      product.shortDescription ??
      product.fullDescription ??
      `Detalhes do produto ${product.name} no catálogo da Material ASR HOW Brasil.`,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const hasStock = product.stockCurrent > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-6 py-8">
      <Link href="/catalogo" className="button-secondary w-fit">
        Voltar ao catálogo
      </Link>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="panel flex min-h-96 items-center justify-center text-sm font-medium text-slate-400">
          Sem imagem cadastrada
        </div>

        <article className="panel space-y-6">
          <div className="space-y-3">
            <span className="badge-brand">
              {product.category?.name ?? "Produto"}
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {product.name}
              </h1>
              {product.subcategory ? (
                <p className="text-sm text-slate-500">
                  Subcategoria: {product.subcategory.name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="mini-card">
              <span className="metric-label">Preço</span>
              <strong className="block pt-2 text-xl font-semibold text-slate-950">
                {formatCurrencyFromCents(product.retailPriceCents)}
              </strong>
            </div>
            <div className="mini-card">
              <span className="metric-label">Estoque</span>
              <strong className="block pt-2 text-xl font-semibold text-slate-950">
                {hasStock ? `${formatInteger(product.stockCurrent)} un.` : "Esgotado"}
              </strong>
            </div>
            <div className="mini-card">
              <span className="metric-label">SKU</span>
              <strong className="block break-all pt-2 text-base font-semibold text-slate-950">
                {product.sku}
              </strong>
            </div>
          </div>

          {product.fullDescription || product.shortDescription ? (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-950">Descrição</h2>
              <p className="whitespace-pre-line text-base leading-8 text-slate-600">
                {product.fullDescription ?? product.shortDescription}
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            O botão de compra será liberado na etapa de carrinho, checkout, aprovação
            de cliente e validação da janela de vendas. Por enquanto, esta página é
            uma vitrine consultiva segura.
          </div>
        </article>
      </section>
    </main>
  );
}
