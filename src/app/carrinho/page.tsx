import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  clearCartAction,
  removeCartItemAction,
  updateCartItemAction,
} from "@/app/carrinho/actions";
import {
  ORDER_MINIMUM_CENTS,
  calculateOrderPricing,
} from "@/domain/order-pricing";
import { getCartItems } from "@/lib/cart";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carrinho",
  description: "Revise os itens antes de finalizar o pedido.",
};

export default async function CartPage() {
  const cartItems = await getCartItems();

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: cartItems.map((item) => item.productId),
      },
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  const rows = cartItems.flatMap((item) => {
    const product = products.find(
      (candidate) => candidate.id === item.productId,
    );

    if (!product) return [];

    const quantity = Math.min(item.quantity, product.stockCurrent);
    const lineTotalCents = quantity * product.retailPriceCents;

    return [
      {
        item,
        product,
        quantity,
        lineTotalCents,
      },
    ];
  });

  const subtotalCents = rows.reduce(
    (total, row) => total + row.lineTotalCents,
    0,
  );

  const pricing = calculateOrderPricing(subtotalCents);
  const missingMinimumCents = Math.max(0, ORDER_MINIMUM_CENTS - subtotalCents);

  return (
    <main className="page-shell items-start">
      <section className="panel w-full space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="badge-brand">Carrinho</span>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Revisar pedido
            </h1>

            <p className="max-w-3xl text-base leading-7 text-slate-600">
              O estoque será validado novamente no checkout. Pedido mínimo:{" "}
              {formatCurrencyFromCents(ORDER_MINIMUM_CENTS)}.
            </p>
          </div>

          <Link className="button-secondary" href="/catalogo">
            Continuar comprando
          </Link>
        </header>

        {rows.length === 0 ? (
          <div className="mini-card space-y-4">
            <p>Seu carrinho está vazio.</p>

            <Link className="button-primary" href="/catalogo">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {rows.map((row) => {
                const image = row.product.images[0];

                return (
                  <article
                    key={row.product.id}
                    className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-[120px_1fr]"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                      {image ? (
                        <Image
                          src={image.url}
                          alt={image.alt ?? row.product.name}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          Sem imagem
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h2 className="font-semibold text-slate-950">
                          {row.product.name}
                        </h2>

                        <p className="text-sm text-slate-500">
                          SKU {row.product.sku}
                        </p>

                        <p className="text-sm text-slate-600">
                          {formatCurrencyFromCents(
                            row.product.retailPriceCents,
                          )}{" "}
                          • estoque atual: {row.product.stockCurrent}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        <form
                          action={updateCartItemAction}
                          className="flex items-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="productId"
                            value={row.product.id}
                          />

                          <label className="space-y-1">
                            <span className="field-label">Qtd.</span>

                            <input
                              className="field-input w-24"
                              type="number"
                              min={1}
                              max={Math.max(1, row.product.stockCurrent)}
                              name="quantity"
                              defaultValue={row.quantity}
                            />
                          </label>

                          <button className="button-secondary" type="submit">
                            Atualizar
                          </button>
                        </form>

                        <form action={removeCartItemAction}>
                          <input
                            type="hidden"
                            name="productId"
                            value={row.product.id}
                          />

                          <button className="button-secondary" type="submit">
                            Remover
                          </button>
                        </form>
                      </div>

                      <p className="font-semibold text-slate-950">
                        Subtotal do item:{" "}
                        {formatCurrencyFromCents(row.lineTotalCents)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-semibold text-slate-950">Resumo</h2>

              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <strong>
                    {formatCurrencyFromCents(pricing.subtotalCents)}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Desconto</span>
                  <strong>
                    {formatCurrencyFromCents(pricing.discountCentsApplied)}
                  </strong>
                </div>

                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base text-slate-950">
                  <span>Total devido</span>
                  <strong>
                    {formatCurrencyFromCents(pricing.totalDueCents)}
                  </strong>
                </div>
              </div>

              {pricing.isMinimumReached ? (
                <Link className="button-primary w-full" href="/checkout">
                  Finalizar pedido
                </Link>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Faltam {formatCurrencyFromCents(missingMinimumCents)} para
                  atingir o pedido mínimo.
                </div>
              )}

              <form action={clearCartAction}>
                <button className="button-secondary w-full" type="submit">
                  Limpar carrinho
                </button>
              </form>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
