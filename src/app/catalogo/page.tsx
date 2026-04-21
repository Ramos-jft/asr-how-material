import type { Metadata } from "next";
import Link from "next/link";

import { formatCurrencyFromCents } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

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
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
  category: {
    name: string;
    slug: string;
  } | null;
  subcategory: {
    name: string;
    slug: string;
  } | null;
};

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

export default async function CatalogPage({ searchParams }: Readonly<CatalogPageProps>) {
  const params = await searchParams;
  const query = normalizeSearchParam(params.q);
  const categorySlug = normalizeSearchParam(params.categoria);
  const currentPage = getPage(params.page);

  const where = {
    isActive: true,
    status: {
      not: "INACTIVE" as const,
    },
    ...(query
      ? {
          name: {
            contains: query,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(categorySlug
      ? {
          OR: [
            { category: { slug: categorySlug } },
            { subcategory: { slug: categorySlug } },
          ],
        }
      : {}),
  };

  const [categories, totalProducts, products] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true, slug: true } },
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
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-8 px-6 py-8">
      <header className="panel space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="badge-brand">Catálogo</span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Materiais disponíveis
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-600">
                Consulte os produtos importados da planilha inicial. O checkout ainda
                será bloqueado até a implementação do carrinho, aprovação de cliente e
                janela de vendas.
              </p>
            </div>
          </div>

          <Link href="/login" className="button-secondary w-fit">
            Entrar no painel
          </Link>
        </div>

        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_auto]">
          <label className="space-y-2">
            <span className="field-label">Buscar por nome</span>
            <input
              className="field-input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Ex.: medalhão, folheto, livro"
            />
          </label>

          <label className="space-y-2">
            <span className="field-label">Categoria</span>
            <select className="field-input" name="categoria" defaultValue={categorySlug ?? ""}>
              <option value="">Todas</option>
              {categories.map((category: CatalogCategory) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button type="submit" className="button-primary h-12">
              Filtrar
            </button>
            <Link href="/catalogo" className="button-secondary h-12">
              Limpar
            </Link>
          </div>
        </form>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {totalProducts} produto{totalProducts === 1 ? "" : "s"} encontrado
            {totalProducts === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="panel text-center text-slate-600">
            Nenhum produto encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product: CatalogProduct) => (
              <article key={product.id} className="panel panel-tight flex flex-col gap-4">
                <div className="flex h-36 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-400">
                  Sem imagem
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      {product.category?.name ?? "Sem categoria"}
                    </p>
                    <h2 className="text-lg font-semibold leading-6 text-slate-950">
                      <Link href={`/produto/${product.slug}`} className="hover:text-sky-700">
                        {product.name}
                      </Link>
                    </h2>
                  </div>

                  {product.shortDescription ? (
                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                      {product.shortDescription}
                    </p>
                  ) : null}

                  <div className="mt-auto space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-xl font-semibold text-slate-950">
                        {formatCurrencyFromCents(product.retailPriceCents)}
                      </strong>
                      <span className="badge-muted">
                        {product.stockCurrent > 0 ? `${product.stockCurrent} un.` : "Esgotado"}
                      </span>
                    </div>
                    <Link href={`/produto/${product.slug}`} className="button-secondary w-full">
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <nav className="flex items-center justify-between gap-3" aria-label="Paginação do catálogo">
        {canGoBack ? (
          <Link href={createPageHref(currentPage - 1)} className="button-secondary">
            Página anterior
          </Link>
        ) : (
          <span />
        )}

        {canGoForward ? (
          <Link href={createPageHref(currentPage + 1)} className="button-primary">
            Próxima página
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
