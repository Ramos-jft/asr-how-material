import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductStatus, type Prisma } from "@prisma/client";

import { formatCurrencyFromCents } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Catálogo de materiais da ASR HOW Brasil com busca, filtro por categoria e paginação.",
};

type CatalogPageProps = {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    page?: string;
  }>;
};

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
};

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  retailPriceCents: number;
  stockCurrent: number;
  status: ProductStatus;
  category: {
    name: string;
    slug: string;
  } | null;
  subcategory: {
    name: string;
    slug: string;
  } | null;
  images: {
    url: string;
    alt: string | null;
    sortOrder: number;
  }[];
};

const PAGE_SIZE = 20;

function normalizeSearchParam(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function getPage(value: string | undefined): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export default async function CatalogPage({
  searchParams,
}: Readonly<CatalogPageProps>) {
  const params = await searchParams;

  const query = normalizeSearchParam(params.q);
  const categorySlug = normalizeSearchParam(params.categoria);
  const currentPage = getPage(params.page);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    status: {
      not: ProductStatus.INACTIVE,
    },
    ...(query
      ? {
          name: {
            contains: query,
            mode: "insensitive",
          },
        }
      : {}),
    ...(categorySlug
      ? {
          OR: [
            {
              category: {
                slug: categorySlug,
              },
            },
            {
              subcategory: {
                slug: categorySlug,
              },
            },
          ],
        }
      : {}),
  };

  const [categories, totalProducts, products] = await Promise.all([
    prisma.category.findMany({
      where: {
        parentId: null,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
          take: 1,
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  const createPageHref = (page: number) => {
    const nextParams = new URLSearchParams();

    if (query) nextParams.set("q", query);
    if (categorySlug) nextParams.set("categoria", categorySlug);
    if (page > 1) nextParams.set("page", String(page));

    const qs = nextParams.toString();

    return qs ? `/catalogo?${qs}` : "/catalogo";
  };

  return (
    <main className="page-shell items-start">
      <section className="panel w-full space-y-8">
        <header className="space-y-4">
          <span className="badge-brand">Catálogo</span>

          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Materiais disponíveis
            </h1>

            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Consulte os produtos importados da planilha inicial. O checkout
              será liberado após a implementação de carrinho, aprovação de
              cliente e janela de vendas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" href="/">
              Voltar ao início
            </Link>

            <Link className="button-primary" href="/login">
              Entrar no painel
            </Link>
          </div>
        </header>

        <form className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_260px_auto_auto]">
          <div className="space-y-2">
            <label className="field-label" htmlFor="q">
              Buscar por nome
            </label>
            <input
              className="field-input"
              id="q"
              name="q"
              placeholder="Ex.: livro, ficha, medalhão..."
              defaultValue={query}
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="categoria">
              Categoria
            </label>
            <select
              className="field-input"
              id="categoria"
              name="categoria"
              defaultValue={categorySlug}
            >
              <option value="">Todas</option>
              {categories.map((category: CatalogCategory) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button className="button-primary w-full" type="submit">
              Filtrar
            </button>
          </div>

          <div className="flex items-end">
            <Link className="button-secondary w-full" href="/catalogo">
              Limpar
            </Link>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-950">{totalProducts}</strong> produto
            {totalProducts === 1 ? "" : "s"} encontrado
            {totalProducts === 1 ? "" : "s"}.
          </p>

          <p className="text-sm text-slate-600">
            Página {currentPage} de {totalPages}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mini-card">
            Nenhum produto encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product: CatalogProduct) => {
              const image = product.images[0];
              const hasStock = product.stockCurrent > 0;

              return (
                <article
                  className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  key={product.id}
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={image.alt ?? product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-400">
                        Sem imagem
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="space-y-2">
                      <span className="badge-muted">
                        {product.category?.name ?? "Sem categoria"}
                      </span>

                      <h2 className="text-lg font-semibold leading-snug text-slate-950">
                        {product.name}
                      </h2>

                      {product.shortDescription ? (
                        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                          {product.shortDescription}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {formatCurrencyFromCents(product.retailPriceCents)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {hasStock
                            ? `${product.stockCurrent} un.`
                            : "Esgotado"}
                        </p>
                      </div>

                      <Link
                        className="button-secondary"
                        href={`/produto/${product.slug}`}
                        aria-label={`Ver detalhes de ${product.name}`}
                      >
                        Ver detalhes
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <nav
          className="flex flex-wrap items-center justify-between gap-3"
          aria-label="Paginação do catálogo"
        >
          {canGoBack ? (
            <Link
              className="button-secondary"
              href={createPageHref(currentPage - 1)}
            >
              Página anterior
            </Link>
          ) : (
            <span />
          )}

          {canGoForward ? (
            <Link
              className="button-secondary"
              href={createPageHref(currentPage + 1)}
            >
              Próxima página
            </Link>
          ) : null}
        </nav>
      </section>
    </main>
  );
}
