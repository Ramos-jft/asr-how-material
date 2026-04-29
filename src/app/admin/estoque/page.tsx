import type { Metadata } from "next";
import Link from "next/link";
import { ProductStatus, StockMovementType } from "@prisma/client";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estoque",
  description: "Consulta administrativa de estoque e movimentações.",
};

const movementLabels = {
  [StockMovementType.ENTRY]: "Entrada",
  [StockMovementType.ADJUSTMENT]: "Ajuste",
  [StockMovementType.RESERVE]: "Reserva",
  [StockMovementType.SALE]: "Venda",
  [StockMovementType.PDV_SALE]: "Venda PDV",
  [StockMovementType.RETURN]: "Retorno",
  [StockMovementType.CANCEL_RELEASE]: "Liberação por cancelamento",
} satisfies Record<StockMovementType, string>;

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

export default async function AdminStockPage() {
  await requirePermission(PERMISSIONS.STOCK_READ);

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
            Consulta de estoque
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Acompanhe produtos com estoque baixo, itens sem estoque e
            movimentações recentes. Ajustes manuais ficam para uma próxima etapa
            para evitar alterações acidentais.
          </p>
        </div>
      </header>

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
                          href={`/produto/${product.slug}`}
                          target="_blank"
                          rel="noreferrer"
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

                      <td className="px-4 py-3 align-top text-slate-700">
                        {product.status}
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
