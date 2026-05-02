import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Prisma, ProductStatus } from "@prisma/client";

import { uploadProductImageAction } from "@/app/admin/produtos/actions";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Consulta administrativa de produtos cadastrados.",
};

type AdminProductsPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

type ProductImagePreviewProps = Readonly<{
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
  }>;
  productName: string;
}>;

const statusLabels = {
  [ProductStatus.ACTIVE]: "Ativo",
  [ProductStatus.INACTIVE]: "Inativo",
  [ProductStatus.OUT_OF_STOCK]: "Sem estoque",
} satisfies Record<ProductStatus, string>;

const statusClassNames = {
  [ProductStatus.ACTIVE]: "border-emerald-200 bg-emerald-50 text-emerald-800",
  [ProductStatus.INACTIVE]: "border-slate-200 bg-slate-100 text-slate-700",
  [ProductStatus.OUT_OF_STOCK]: "border-red-200 bg-red-50 text-red-700",
} satisfies Record<ProductStatus, string>;

const productStatusOptions = Object.values(ProductStatus);

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStringParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string {
  const value = params?.[key];

  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function isProductStatus(value: string): value is ProductStatus {
  return productStatusOptions.includes(value as ProductStatus);
}

function AlertMessage({
  type,
  message,
}: Readonly<{
  type: "success" | "error";
  message?: string;
}>) {
  if (!message) return null;

  const className =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-3 text-sm ${className}`}
    >
      {message}
    </div>
  );
}

function ProductStatusBadge({ status }: Readonly<{ status: ProductStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClassNames[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function ProductImagePreview({
  images,
  productName,
}: ProductImagePreviewProps) {
  const mainImage = images[0];

  if (!mainImage) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-2 text-center text-xs text-slate-400">
        Sem imagem
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <Image
          src={mainImage.url}
          alt={mainImage.alt ?? productName}
          fill
          sizes="64px"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          +{images.length - 1}
        </span>
      ) : null}
    </div>
  );
}

function ProductImageUploadForm({
  productId,
}: Readonly<{
  productId: string;
}>) {
  return (
    <form
      action={uploadProductImageAction}
      className="w-full min-w-0 space-y-2"
    >
      <input type="hidden" name="productId" value={productId} />

      <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-blue-800 transition hover:border-blue-800 hover:bg-blue-50">
        Escolher imagem
        <input
          className="sr-only"
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/webp"
          required
        />
      </label>

      <button
        className="inline-flex w-full items-center justify-center rounded-full bg-blue-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-900"
        type="submit"
      >
        Enviar
      </button>
    </form>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const auth = await requirePermission(PERMISSIONS.PRODUCTS_READ);
  const canUploadImages = hasPermission(
    auth.permissions,
    PERMISSIONS.PRODUCTS_IMAGES_UPLOAD,
  );

  const params = await searchParams;
  const search = getStringParam(params, "q");
  const rawStatus = getStringParam(params, "status");
  const selectedStatus = isProductStatus(rawStatus) ? rawStatus : null;

  const successMessage = getStringParam(params, "sucesso");
  const errorMessage = getStringParam(params, "erro");

  const where: Prisma.ProductWhereInput = {};

  if (selectedStatus) {
    where.status = selectedStatus;
  }

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        sku: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        brand: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        model: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [products, totalProducts, countsByStatus] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
      include: {
        category: {
          select: {
            name: true,
          },
        },
        subcategory: {
          select: {
            name: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
          take: 3,
        },
        _count: {
          select: {
            orderItems: true,
            stockMovements: true,
          },
        },
      },
    }),
    prisma.product.count(),
    prisma.product.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const statusCounts = Object.fromEntries(
    countsByStatus.map((item) => [item.status, item._count._all]),
  ) as Partial<Record<ProductStatus, number>>;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">Produtos</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Consulta de produtos
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Consulte os produtos disponíveis, preços, estoque e status. Quando
            necessário, envie uma imagem do produto para facilitar o
            atendimento.
          </p>

          {canUploadImages ? (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Upload habilitado para este usuário. Selecione a imagem do produto
              e envie para vinculá-la ao cadastro.
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Seu usuário pode consultar produtos, mas não possui permissão para
              enviar imagens.
            </div>
          )}
        </div>
      </header>

      <div className="space-y-3">
        <AlertMessage type="success" message={successMessage} />
        <AlertMessage type="error" message={errorMessage} />
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-card">
          <span className="metric-label">Total</span>
          <strong className="metric-value">{totalProducts}</strong>
        </article>

        {productStatusOptions.map((status) => (
          <article className="metric-card" key={status}>
            <span className="metric-label">{statusLabels[status]}</span>
            <strong className="metric-value">
              {statusCounts[status] ?? 0}
            </strong>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          Filtros
        </h3>

        <form className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <input
            className="field-input"
            name="q"
            placeholder="Buscar por nome, SKU, marca ou modelo"
            defaultValue={search}
          />

          <select
            className="field-input"
            name="status"
            defaultValue={selectedStatus ?? ""}
          >
            <option value="">Todos os status</option>
            {productStatusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>

          <button className="button-primary" type="submit">
            Filtrar
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Produtos encontrados
        </h3>

        {products.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Nenhum produto encontrado para os filtros selecionados.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={
                    canUploadImages
                      ? "grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_88px_minmax(0,0.9fr)_minmax(0,0.75fr)_minmax(0,0.65fr)_minmax(0,0.85fr)_minmax(0,0.75fr)] xl:items-center"
                      : "grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_88px_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.9fr)] xl:items-center"
                  }
                >
                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Produto
                    </span>

                    <Link
                      className="break-words font-semibold text-slate-950 underline-offset-4 hover:underline"
                      href={`/produto/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {product.name}
                    </Link>

                    <p className="mt-1 text-xs text-slate-500">
                      SKU: {product.sku}
                    </p>

                    {product.brand || product.model ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {[product.brand, product.model]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Imagem
                    </span>

                    <ProductImagePreview
                      images={product.images}
                      productName={product.name}
                    />
                  </div>

                  <div className="min-w-0 text-sm text-slate-600">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Categoria
                    </span>

                    <p>{product.category?.name ?? "Sem categoria"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.subcategory?.name ?? "Sem subcategoria"}
                    </p>
                  </div>

                  <div className="min-w-0 text-sm text-slate-700">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Preço
                    </span>

                    <p className="font-semibold text-slate-950">
                      {formatCurrency(product.retailPriceCents)}
                    </p>

                    {product.wholesalePriceCents ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Atacado: {formatCurrency(product.wholesalePriceCents)}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0 text-sm text-slate-700">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Estoque
                    </span>

                    <p>
                      Atual:{" "}
                      <strong className="text-slate-950">
                        {product.stockCurrent}
                      </strong>
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Mínimo: {product.stockMin}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </span>

                    <ProductStatusBadge status={product.status} />

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Atualizado em {formatDateTime(product.updatedAt)}
                    </p>
                  </div>

                  {canUploadImages ? (
                    <div className="min-w-0">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Imagem
                      </span>

                      <ProductImageUploadForm productId={product.id} />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
