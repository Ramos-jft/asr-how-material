import type { Metadata } from "next";
import Link from "next/link";
import { ProductStatus, StockMovementType } from "@prisma/client";

import { adjustStockAction } from "@/app/admin/estoque/actions";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estoque",
  description: "Consulta administrativa de estoque e movimentações.",
};

type AdminStockPageProps = Readonly<{
  searchParams?: Promise<{
    sucesso?: string;
    erro?: string;
  }>;
}>;

const movementLabels = {
  [StockMovementType.ENTRY]: "Entrada",
  [StockMovementType.ADJUSTMENT]: "Ajuste",
  [StockMovementType.RESERVE]: "Reserva",
  [StockMovementType.SALE]: "Venda",
  [StockMovementType.PDV_SALE]: "Venda PDV",
  [StockMovementType.RETURN]: "Retorno",
  [StockMovementType.CANCEL_RELEASE]: "Liberação por cancelamento",
} satisfies Record<StockMovementType, string>;

const productStatusLabels = {
  [ProductStatus.ACTIVE]: "Disponível",
  [ProductStatus.INACTIVE]: "Indisponível",
  [ProductStatus.OUT_OF_STOCK]: "Sem estoque",
} satisfies Record<ProductStatus, string>;

const productStatusClassNames = {
  [ProductStatus.ACTIVE]: "border-emerald-200 bg-emerald-50 text-emerald-800",
  [ProductStatus.INACTIVE]: "border-slate-200 bg-slate-100 text-slate-700",
  [ProductStatus.OUT_OF_STOCK]: "border-red-200 bg-red-50 text-red-700",
} satisfies Record<ProductStatus, string>;

function getDisplayProductStatus(product: {
  status: ProductStatus;
  stockCurrent: number;
}): ProductStatus {
  if (product.status === ProductStatus.INACTIVE) {
    return ProductStatus.INACTIVE;
  }

  if (
    product.stockCurrent <= 0 ||
    product.status === ProductStatus.OUT_OF_STOCK
  ) {
    return ProductStatus.OUT_OF_STOCK;
  }

  return ProductStatus.ACTIVE;
}

function ProductStatusBadge({ status }: Readonly<{ status: ProductStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${productStatusClassNames[status]}`}
    >
      {productStatusLabels[status]}
    </span>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStockClassName(input: {
  isCritical: boolean;
  isLow: boolean;
}): string {
  if (input.isCritical) {
    return "font-bold text-red-700";
  }

  if (input.isLow) {
    return "font-bold text-amber-700";
  }

  return "font-semibold text-slate-950";
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

export default async function AdminStockPage({
  searchParams,
}: AdminStockPageProps) {
  const auth = await requirePermission(PERMISSIONS.STOCK_READ);
  const params = await searchParams;

  const canAdjustStock = hasPermission(
    auth.permissions,
    PERMISSIONS.STOCK_ADJUST,
  );

  const [products, recentMovements] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        status: true,
        stockCurrent: true,
        stockMin: true,
        updatedAt: true,
      },
      orderBy: [
        {
          stockCurrent: "asc",
        },
        {
          name: "asc",
        },
      ],
      take: 100,
    }),
    prisma.stockMovement.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        product: {
          select: {
            sku: true,
            name: true,
            slug: true,
          },
        },
        order: {
          select: {
            code: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const outOfStockCount = products.filter(
    (product) =>
      product.stockCurrent <= 0 ||
      product.status === ProductStatus.OUT_OF_STOCK,
  ).length;

  const lowStockCount = products.filter(
    (product) =>
      product.stockCurrent > 0 && product.stockCurrent <= product.stockMin,
  ).length;

  const totalStockUnits = products.reduce(
    (total, product) => total + product.stockCurrent,
    0,
  );

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">Estoque</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Consulta e ajuste de estoque
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Acompanhe produtos com estoque baixo, itens sem estoque e
            movimentações recentes. Usuários autorizados também podem registrar
            entrada ou ajuste manual com auditoria.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <AlertMessage type="success" message={params?.sucesso} />
        <AlertMessage type="error" message={params?.erro} />
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="metric-card">
          <span className="metric-label">Produtos listados</span>
          <strong className="metric-value">{products.length}</strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">Unidades em estoque</span>
          <strong className="metric-value">{totalStockUnits}</strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">Estoque baixo</span>
          <strong className="metric-value">{lowStockCount}</strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">Sem estoque</span>
          <strong className="metric-value">{outOfStockCount}</strong>
        </article>
      </section>

      {canAdjustStock ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Ajuste manual de estoque
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use entrada para somar unidades ao estoque. Use ajuste absoluto
              para corrigir o saldo final do produto. O motivo é obrigatório e a
              operação fica registrada no histórico.
            </p>
          </div>

          <form
            action={adjustStockAction}
            className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_180px_minmax(0,1fr)_auto]"
          >
            <label className="space-y-2">
              <span className="field-label">Produto</span>
              <select className="field-input" name="productId" required>
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} — {product.name} — estoque atual:{" "}
                    {product.stockCurrent}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="field-label">Tipo</span>
              <select
                className="field-input"
                name="movementType"
                defaultValue="ENTRY"
                required
              >
                <option value="ENTRY">Entrada</option>
                <option value="ADJUSTMENT">Ajuste absoluto</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="field-label">Quantidade</span>
              <input
                className="field-input"
                name="quantity"
                type="number"
                min={0}
                step={1}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="field-label">Motivo</span>
              <input
                className="field-input"
                name="reason"
                placeholder="Ex.: entrada de mercadoria, inventário, correção..."
                required
              />
            </label>

            <div className="flex items-end">
              <button className="button-primary w-full" type="submit">
                Registrar
              </button>
            </div>
          </form>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            No modo <strong>Entrada</strong>, a quantidade será somada ao
            estoque atual. No modo <strong>Ajuste absoluto</strong>, a
            quantidade será o novo saldo final do produto.
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Seu usuário pode consultar estoque, mas não possui permissão para
          ajustes manuais.
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Produtos com menor estoque
        </h3>

        {products.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Nenhum produto encontrado.
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
                    Estoque atual
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Estoque mínimo
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Atualizado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {products.map((product) => {
                  const isCritical =
                    product.stockCurrent <= 0 ||
                    product.status === ProductStatus.OUT_OF_STOCK;

                  const isLow =
                    !isCritical && product.stockCurrent <= product.stockMin;

                  return (
                    <tr key={product.id}>
                      <td className="px-4 py-3 align-top">
                        <Link
                          className="font-semibold text-slate-950 underline-offset-4 hover:underline"
                          href={`/admin/produtos?q=${encodeURIComponent(
                            product.sku,
                          )}`}
                        >
                          {product.name}
                        </Link>

                        <p className="mt-1 text-xs text-slate-500">
                          SKU: {product.sku}
                        </p>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className={getStockClassName({
                            isCritical,
                            isLow,
                          })}
                        >
                          {product.stockCurrent}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top text-slate-700">
                        {product.stockMin}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <ProductStatusBadge
                          status={getDisplayProductStatus(product)}
                        />
                      </td>

                      <td className="px-4 py-3 align-top text-slate-600">
                        {formatDateTime(product.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Movimentações recentes
        </h3>

        {recentMovements.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Nenhuma movimentação encontrada.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {recentMovements.map((movement) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                key={movement.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {movement.product.name}
                    </p>

                    <p className="mt-1 text-slate-600">
                      SKU: {movement.product.sku}
                    </p>

                    <p className="mt-1 text-slate-600">
                      Tipo: {movementLabels[movement.type]}
                    </p>

                    {movement.order ? (
                      <p className="mt-1 text-slate-600">
                        Pedido: {movement.order.code}
                      </p>
                    ) : null}

                    {movement.reason ? (
                      <p className="mt-1 text-slate-600">
                        Motivo: {movement.reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="font-semibold text-slate-950">
                      {movement.previousStock} → {movement.newStock}
                    </p>

                    <p className="mt-1 text-slate-600">
                      Quantidade: {movement.quantity}
                    </p>

                    <p className="mt-1 text-slate-500">
                      {formatDateTime(movement.createdAt)}
                    </p>

                    {movement.user ? (
                      <p className="mt-1 text-slate-500">
                        {movement.user.name}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
