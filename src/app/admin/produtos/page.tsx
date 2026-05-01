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
    <form action={uploadProductImageAction} className="min-w-56 space-y-2">
      <input type="hidden" name="productId" value={productId} />

      <input
        className="block w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-800 hover:file:bg-blue-100"
        type="file"
        name="image"
        accept="image/png,image/jpeg,image/webp"
        required
      />

      <button
        className="rounded-full bg-blue-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-900"
        type="submit"
      >
        Enviar imagem
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
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">Produtos</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Consulta de produtos
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Consulte produtos, preços, estoque e status. Usuários com permissão
            de upload podem enviar imagens para o armazenamento configurado no
            Cloudflare R2.
          </p>

          {canUploadImages ? (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Upload habilitado para este usuário. As imagens serão enviadas
              para o Cloudflare R2 e vinculadas ao produto no banco.
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Seu usuário pode visualizar produtos, mas não possui permissão
              para enviar imagens.
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
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Imagem
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Preço
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Estoque
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Atualizado
                  </th>
                  {canUploadImages ? (
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Upload
                    </th>
                  ) : null}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 align-top">
                      <Link
                        className="font-semibold text-slate-950 underline-offset-4 hover:underline"
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
                    </td>

                    <td className="px-4 py-3 align-top">
                      <ProductImagePreview
                        images={product.images}
                        productName={product.name}
                      />
                    </td>

                    <td className="px-4 py-3 align-top text-slate-600">
                      <p>{product.category?.name ?? "Sem categoria"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.subcategory?.name ?? "Sem subcategoria"}
                      </p>
                    </td>

                    <td className="px-4 py-3 align-top text-slate-700">
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(product.retailPriceCents)}
                      </p>

                      {product.wholesalePriceCents ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Atacado: {formatCurrency(product.wholesalePriceCents)}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-700">
                      <p>
                        Atual:{" "}
                        <strong className="text-slate-950">
                          {product.stockCurrent}
                        </strong>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Mínimo: {product.stockMin}
                      </p>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <ProductStatusBadge status={product.status} />
                    </td>

                    <td className="px-4 py-3 align-top text-slate-600">
                      {formatDateTime(product.updatedAt)}
                    </td>

                    {canUploadImages ? (
                      <td className="px-4 py-3 align-top">
                        <ProductImageUploadForm productId={product.id} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
