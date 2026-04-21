import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { formatCurrencyFromCents, formatInteger } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
        not: ProductStatus.INACTIVE,
      },
    },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      subcategory: {
        select: {
          name: true,
          slug: true,
        },
      },
      images: {
        select: {
          url: true,
          alt: true,
          sortOrder: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
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

export default async function ProductDetailPage({
  params,
}: Readonly<ProductDetailPageProps>) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const hasStock = product.stockCurrent > 0;
  const mainImage = product.images[0];

  return (
    <main className="page-shell items-start">
      <section className="panel grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Link className="button-secondary" href="/catalogo">
            Voltar ao catálogo
          </Link>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            <div className="relative aspect-[4/3]">
              {mainImage ? (
                <Image
                  src={mainImage.url}
                  alt={mainImage.alt ?? product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-400">
                  Sem imagem cadastrada
                </div>
              )}
            </div>
          </div>

          {product.images.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {product.images.slice(1).map((image) => (
                <div
                  className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                  key={`${image.url}-${image.sortOrder}`}
                >
                  <Image
                    src={image.url}
                    alt={image.alt ?? product.name}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="space-y-4">
            <span className="badge-brand">
              {product.category?.name ?? "Produto"}
            </span>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                {product.name}
              </h1>

              {product.subcategory ? (
                <p className="text-sm text-slate-500">
                  Subcategoria: {product.subcategory.name}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="mini-card">
              <span className="metric-label">Preço</span>
              <strong className="metric-value text-2xl">
                {formatCurrencyFromCents(product.retailPriceCents)}
              </strong>
            </div>

            <div className="mini-card">
              <span className="metric-label">Estoque</span>
              <strong className="metric-value text-2xl">
                {hasStock
                  ? `${formatInteger(product.stockCurrent)} un.`
                  : "Esgotado"}
              </strong>
            </div>
          </div>

          <div className="mini-card space-y-2">
            <span className="metric-label">SKU</span>
            <p className="font-mono text-sm text-slate-700">{product.sku}</p>
          </div>

          {product.fullDescription || product.shortDescription ? (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-950">
                Descrição
              </h2>

              <p className="leading-7 text-slate-600">
                {product.fullDescription ?? product.shortDescription}
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            O botão de compra será liberado na etapa de carrinho, checkout,
            aprovação de cliente e validação da janela de vendas. Por enquanto,
            esta página é uma vitrine consultiva segura.
          </div>
        </aside>
      </section>
    </main>
  );
}
