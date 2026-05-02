import type { Metadata } from "next";
import { ProductStatus } from "@prisma/client";

import {
  addPdvCartItemAction,
  clearPdvCartAction,
  finalizePdvSaleAction,
  removePdvCartItemAction,
  updatePdvCartItemAction,
} from "@/app/admin/pdv/actions";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPdvCartItems } from "@/lib/pdv-cart";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PDV",
  description: "Ponto de venda com carrinho, PIX/dinheiro e baixa de estoque.",
};

type AdminPdvPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

type PdvCartRow = {
  productId: string;
  sku: string;
  name: string;
  unit: string | null;
  quantity: number;
  stockCurrent: number;
  retailPriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
  overrideReason: string | null;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatCurrencyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
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

function buildPdvCartRows(
  cartItems: Awaited<ReturnType<typeof getPdvCartItems>>,
  products: Awaited<ReturnType<typeof getCartProducts>>,
): PdvCartRow[] {
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );

  return cartItems
    .map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        return null;
      }

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        quantity: item.quantity,
        stockCurrent: product.stockCurrent,
        retailPriceCents: product.retailPriceCents,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.unitPriceCents * item.quantity,
        overrideReason: item.overrideReason,
      };
    })
    .filter((row): row is PdvCartRow => row !== null);
}

async function getCartProducts(productIds: string[]) {
  if (productIds.length === 0) {
    return [];
  }

  return prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      retailPriceCents: true,
      stockCurrent: true,
    },
  });
}

export default async function AdminPdvPage({
  searchParams,
}: AdminPdvPageProps) {
  await requirePermission(PERMISSIONS.PDV_CREATE_ORDER);

  const params = await searchParams;
  const search = getStringParam(params, "q");
  const successMessage = getStringParam(params, "sucesso");
  const errorMessage = getStringParam(params, "erro");

  const cartItems = await getPdvCartItems();
  const cartProductIds = cartItems.map((item) => item.productId);

  const [products, cartProducts] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        status: ProductStatus.ACTIVE,
        stockCurrent: {
          gt: 0,
        },
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  sku: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  barcode: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
      take: 50,
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        retailPriceCents: true,
        stockCurrent: true,
        unit: true,
      },
    }),
    getCartProducts(cartProductIds),
  ]);

  const cartRows = buildPdvCartRows(cartItems, cartProducts);
  const subtotalCents = cartRows.reduce(
    (total, item) => total + item.lineTotalCents,
    0,
  );

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <AlertMessage type="success" message={successMessage} />
        <AlertMessage type="error" message={errorMessage} />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="metric-card">
          <span className="metric-label">Itens no PDV</span>
          <strong className="metric-value">{cartRows.length}</strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">Unidades</span>
          <strong className="metric-value">
            {cartRows.reduce((total, item) => total + item.quantity, 0)}
          </strong>
        </article>

        <article className="metric-card">
          <span className="metric-label">Total da venda</span>
          <strong className="metric-value">
            {formatCurrency(subtotalCents)}
          </strong>
        </article>
      </section>

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">PDV</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Ponto de venda
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Venda direta para eventos, sem exigir cliente cadastrado. A venda é
            criada como paga, baixa estoque imediatamente e registra auditoria.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">Buscar produto</h3>

        <form className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className="field-input"
            name="q"
            placeholder="Buscar por nome, SKU ou código de barras"
            defaultValue={search}
          />

          <button className="button-primary" type="submit">
            Buscar
          </button>
        </form>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">
            Produtos disponíveis
          </h3>

          {products.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Nenhum produto ativo com estoque disponível.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {products.map((product) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  key={product.id}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:items-start">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-950">
                        {product.name}
                      </h4>

                      <p className="text-sm text-slate-600">
                        SKU: {product.sku}
                      </p>

                      {product.barcode ? (
                        <p className="text-sm text-slate-600">
                          Código: {product.barcode}
                        </p>
                      ) : null}

                      <p className="text-sm text-slate-600">
                        Estoque: {product.stockCurrent} {product.unit ?? "un."}
                      </p>

                      <p className="font-semibold text-slate-950">
                        {formatCurrency(product.retailPriceCents)}
                      </p>
                    </div>

                    <form
                      action={addPdvCartItemAction}
                      className="grid w-full min-w-0 gap-3"
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="field-label">Quantidade</span>
                          <input
                            className="field-input"
                            type="number"
                            name="quantity"
                            min={1}
                            max={product.stockCurrent}
                            defaultValue={1}
                            required
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="field-label">Preço PDV</span>
                          <input
                            className="field-input"
                            name="overrideUnitPrice"
                            inputMode="decimal"
                            placeholder={formatCurrencyInput(
                              product.retailPriceCents,
                            )}
                          />
                        </label>
                      </div>

                      <label className="space-y-2">
                        <span className="field-label">
                          Motivo do aumento de preço
                        </span>
                        <input
                          className="field-input"
                          name="overrideReason"
                          placeholder="Informe o motivo do aumento"
                        />
                      </label>

                      <button type="submit" className="button-primary">
                        Adicionar ao PDV
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Carrinho PDV
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Revise os itens antes de finalizar. A baixa de estoque ocorre na
              finalização da venda.
            </p>
          </div>

          {cartRows.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhum item no carrinho PDV.
            </p>
          ) : (
            <div className="space-y-4">
              {cartRows.map((item) => {
                const hasOverride =
                  item.unitPriceCents !== item.retailPriceCents;

                return (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={item.productId}
                  >
                    <div className="space-y-2">
                      <h4 className="font-semibold text-slate-950">
                        {item.name}
                      </h4>

                      <p className="text-sm text-slate-600">SKU: {item.sku}</p>

                      <p className="text-sm text-slate-600">
                        Estoque disponível: {item.stockCurrent}
                      </p>

                      {hasOverride ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                          Preço alterado. Motivo:{" "}
                          {item.overrideReason ?? "não informado"}
                        </p>
                      ) : null}
                    </div>

                    <form
                      action={updatePdvCartItemAction}
                      className="mt-4 grid gap-3"
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={item.productId}
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="field-label">Qtd.</span>
                          <input
                            className="field-input"
                            type="number"
                            name="quantity"
                            min={1}
                            max={item.stockCurrent}
                            defaultValue={item.quantity}
                            required
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="field-label">Preço</span>
                          <input
                            className="field-input"
                            name="overrideUnitPrice"
                            inputMode="decimal"
                            defaultValue={formatCurrencyInput(
                              item.unitPriceCents,
                            )}
                          />
                        </label>
                      </div>

                      <label className="space-y-2">
                        <span className="field-label">
                          Motivo do aumento de preço
                        </span>
                        <input
                          className="field-input"
                          name="overrideReason"
                          defaultValue={item.overrideReason ?? ""}
                          placeholder="Informe o motivo do aumento"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button type="submit" className="button-secondary">
                          Atualizar
                        </button>
                      </div>
                    </form>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(item.lineTotalCents)}
                      </p>

                      <form action={removePdvCartItemAction}>
                        <input
                          type="hidden"
                          name="productId"
                          value={item.productId}
                        />

                        <button
                          type="submit"
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Remover
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-slate-600">
                    Total
                  </span>

                  <strong className="text-xl text-slate-950">
                    {formatCurrency(subtotalCents)}
                  </strong>
                </div>
              </div>

              <form action={finalizePdvSaleAction} className="space-y-4">
                <label className="space-y-2">
                  <span className="field-label">Forma de pagamento</span>
                  <select
                    className="field-input"
                    name="paymentMethod"
                    defaultValue="PIX"
                    required
                  >
                    <option value="PIX">PIX</option>
                    <option value="CASH">Dinheiro</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="field-label">Consumidor</span>
                  <input
                    className="field-input"
                    name="customerName"
                    placeholder="Opcional"
                  />
                </label>

                <label className="space-y-2">
                  <span className="field-label">Observações</span>
                  <textarea
                    className="field-input min-h-24"
                    name="notes"
                    placeholder="Opcional"
                  />
                </label>

                <button type="submit" className="button-primary w-full">
                  Finalizar venda PDV
                </button>
              </form>

              <form action={clearPdvCartAction}>
                <button type="submit" className="button-secondary w-full">
                  Limpar carrinho PDV
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
