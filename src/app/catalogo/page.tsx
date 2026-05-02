import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductStatus, type Prisma } from "@prisma/client";

import { logoutAction } from "@/app/actions/logout";
import { addToCartAction } from "@/app/carrinho/actions";
import { BackButton } from "@/components/navigation/BackButton";
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

const buyerLinks = [
  {
    href: "/catalogo",
    label: "Catálogo",
  },
  {
    href: "/carrinho",
    label: "Carrinho",
  },
  {
    href: "/checkout",
    label: "Checkout",
  },
  {
    href: "/pedidos",
    label: "Meus pedidos",
  },
  {
    href: "/minha-conta",
    label: "Minha conta",
  },
];

const categorySelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.CategorySelect;

type CatalogCategory = Prisma.CategoryGetPayload<{
  select: typeof categorySelect;
}>;

const productSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  retailPriceCents: true,
  stockCurrent: true,
  status: true,
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
} satisfies Prisma.ProductSelect;

type CatalogProduct = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

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
      select: categorySelect,
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: productSelect,
    }),
  ]);

  const typedCategories: CatalogCategory[] = categories;
  const typedProducts: CatalogProduct[] = products;

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  const createPageHref = (page: number) => {
    const nextParams = new URLSearchParams();

    if (query) nextParams.set("q", query);
    if (categorySlug) nextParams.set("categoria", categorySlug);
    if (page > 1) nextParams.set("page", String(page));

    const queryString = nextParams.toString();

    return queryString ? `/catalogo?${queryString}` : "/catalogo";
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-end">
          <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
            <Link
              href="/catalogo"
              aria-label="Ir para o catálogo"
              className="relative hidden h-24 w-40 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:block lg:h-28 lg:w-44"
            >
              <Image
                src="/logo-asr-how.png"
                alt="Logo ASR HOW Brasil"
                fill
                priority
                sizes="176px"
                className="object-contain"
              />
            </Link>

            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-blue-800">
              Área do comprador
            </p>

            <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-slate-950">
              Material ASR HOW Brasil
            </h1>
          </div>

          <nav
            className="flex min-w-0 flex-wrap justify-center gap-2 lg:self-end"
            aria-label="Menu do comprador"
          >
            {buyerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-800 hover:text-blue-800"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col items-center gap-3 lg:self-end">
            <div className="relative hidden h-16 w-16 sm:block">
              <Image
                src="/logo-na.png"
                alt="Logo NA"
                fill
                priority
                sizes="64px"
                className="object-contain"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <BackButton />

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-red-700 bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-800 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <section className="space-y-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <header className="space-y-5">
            <div className="space-y-4">
              <span className="badge-brand">Catálogo</span>

              <div className="space-y-3">
                <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Materiais disponíveis
                </h2>

                <p className="max-w-3xl text-base leading-7 text-slate-600">
                  Consulte os produtos disponíveis. A finalização do pedido
                  depende de cadastro aprovado, pedido mínimo, estoque
                  disponível, janela de vendas e instruções de PIX.
                </p>
              </div>
            </div>
          </header>

          <form className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_260px_auto_auto]">
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
                defaultValue={categorySlug ?? ""}
              >
                <option value="">Todas</option>
                {typedCategories.map((category) => (
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
              <strong className="text-slate-950">{totalProducts}</strong>{" "}
              produto
              {totalProducts === 1 ? "" : "s"} encontrado
              {totalProducts === 1 ? "" : "s"}.
            </p>

            <p className="text-sm text-slate-600">
              Página {currentPage} de {totalPages}
            </p>
          </div>

          {typedProducts.length === 0 ? (
            <div className="mini-card">
              Nenhum produto encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {typedProducts.map((product) => {
                const image = product.images[0];
                const hasStock = product.stockCurrent > 0;

                return (
                  <article
                    className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    key={product.id}
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {image ? (
                        <Image
                          src={image.url}
                          alt={image.alt ?? product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
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

                        <h3 className="break-words text-lg font-semibold leading-snug text-slate-950">
                          {product.name}
                        </h3>

                        {product.shortDescription ? (
                          <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                            {product.shortDescription}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-auto space-y-4">
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

                        <div className="grid gap-2 sm:grid-cols-2">
                          <Link
                            className="button-secondary"
                            href={`/produto/${product.slug}`}
                            aria-label={`Ver detalhes de ${product.name}`}
                          >
                            Ver detalhes
                          </Link>

                          {hasStock ? (
                            <form action={addToCartAction}>
                              <input
                                type="hidden"
                                name="productId"
                                value={product.id}
                              />
                              <input type="hidden" name="quantity" value="1" />

                              <button
                                className="button-primary w-full"
                                type="submit"
                              >
                                Adicionar
                              </button>
                            </form>
                          ) : null}
                        </div>
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
      </div>
    </main>
  );
}
