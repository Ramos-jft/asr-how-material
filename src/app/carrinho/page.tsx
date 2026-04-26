import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductStatus } from "@prisma/client";
import {
  clearCartAction,
  removeCartItemAction,
  updateCartItemAction,
} from "@/app/carrinho/actions";
import { calculateOrderPricing } from "@/domain/order-pricing";
import { getCartItems } from "@/lib/cart";
import { formatCurrencyFromCents, formatInteger } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carrinho",
  description:
    "Revise os produtos selecionados antes de avançar para o checkout da Material ASR HOW Brasil.",
};

export default async function CartPage() {
  const cartItems = await getCartItems();
  const productIds = cartItems.map((item) => item.productId);

  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
            isActive: true,
            status: {
              not: ProductStatus.INACTIVE,
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            retailPriceCents: true,
            stockCurrent: true,
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
        })
      : [];

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );

  const availableItems = cartItems
    .map((cartItem) => {
      const product = productsById.get(cartItem.productId);

      if (!product || product.stockCurrent <= 0) {
        return null;
      }

      const quantity = Math.min(cartItem.quantity, product.stockCurrent);

      return {
        product,
        quantity,
        requestedQuantity: cartItem.quantity,
        lineTotalCents: product.retailPriceCents * quantity,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const subtotalCents = availableItems.reduce(
    (total, item) => total + item.lineTotalCents,
    0,
  );

  const pricing = calculateOrderPricing(subtotalCents);

  return (
    <main className="page-shell items-start">
      <section className="panel w-full space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <span className="badge-brand">Carrinho</span>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                Revise seu pedido
              </h1>

              <p className="max-w-3xl text-base leading-7 text-slate-600">
                Confira os materiais selecionados. O checkout será a próxima
                etapa, com validação de cliente aprovado, pedido mínimo,
                desconto e instruções de PIX.
              </p>
            </div>
          </div>

          <Link className="button-secondary" href="/catalogo">
            Continuar comprando
          </Link>
        </header>

        {availableItems.length === 0 ? (
          <div className="mini-card space-y-4">
            <p className="text-base font-medium text-slate-950">
              Seu carrinho está vazio.
            </p>

            <p className="text-sm leading-6 text-slate-600">
              Adicione produtos pelo catálogo para iniciar um pedido.
            </p>

            <Link className="button-primary inline-flex" href="/catalogo">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {availableItems.map((item) => {
                const image = item.product.images[0];
                const wasQuantityAdjusted =
                  item.quantity !== item.requestedQuantity;

                return (
                  <article
                    className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[120px_minmax(0,1fr)]"
                    key={item.product.id}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                      {image ? (
                        <Image
                          src={image.url}
                          alt={image.alt ?? item.product.name}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-xs font-medium text-slate-400">
                          Sem imagem
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <Link
                          className="text-lg font-semibold leading-snug text-slate-950 hover:text-blue-700"
                          href={`/produto/${item.product.slug}`}
                        >
                          {item.product.name}
                        </Link>

                        <p className="text-sm text-slate-500">
                          SKU:{" "}
                          <span className="font-mono">{item.product.sku}</span>
                        </p>

                        {wasQuantityAdjusted ? (
                          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                            A quantidade foi ajustada para o estoque disponível.
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <form
                          action={updateCartItemAction}
                          className="grid gap-3 sm:grid-cols-[140px_auto]"
                        >
                          <input
                            type="hidden"
                            name="productId"
                            value={item.product.id}
                          />

                          <label className="space-y-2">
                            <span className="field-label">Quantidade</span>

                            <input
                              className="field-input"
                              type="number"
                              name="quantity"
                              min={1}
                              max={item.product.stockCurrent}
                              defaultValue={item.quantity}
                            />
                          </label>

                          <div className="flex items-end">
                            <button
                              className="button-secondary w-full"
                              type="submit"
                            >
                              Atualizar
                            </button>
                          </div>
                        </form>

                        <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
                          <div className="text-right">
                            <p className="text-sm text-slate-500">
                              {formatInteger(item.quantity)} ×{" "}
                              {formatCurrencyFromCents(
                                item.product.retailPriceCents,
                              )}
                            </p>

                            <p className="text-lg font-semibold text-slate-950">
                              {formatCurrencyFromCents(item.lineTotalCents)}
                            </p>
                          </div>

                          <form action={removeCartItemAction}>
                            <input
                              type="hidden"
                              name="productId"
                              value={item.product.id}
                            />

                            <button
                              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                              type="submit"
                            >
                              Remover
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-950">Resumo</h2>

                <p className="text-sm leading-6 text-slate-600">
                  Os valores finais serão revalidados no backend no momento do
                  checkout.
                </p>
              </div>

              <dl className="space-y-3 border-y border-slate-200 py-4">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-slate-600">Subtotal</dt>
                  <dd className="font-semibold text-slate-950">
                    {formatCurrencyFromCents(pricing.subtotalCents)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-slate-600">Desconto</dt>
                  <dd className="font-semibold text-slate-950">
                    {formatCurrencyFromCents(pricing.discountCentsApplied)}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-slate-600">Total devido</dt>
                  <dd className="text-xl font-semibold text-slate-950">
                    {formatCurrencyFromCents(pricing.totalDueCents)}
                  </dd>
                </div>
              </dl>

              {pricing.discountExpiresAt ? (
                <p className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900">
                  Desconto de 10% aplicado. Validade para pagamento:{" "}
                  {pricing.discountExpiresAt.toLocaleDateString("pt-BR")}.
                </p>
              ) : null}

              {pricing.isMinimumReached ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900">
                  Pedido mínimo atingido. O próximo passo será implementar o
                  checkout com reserva de estoque e PIX manual.
                </p>
              ) : (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                  O pedido mínimo é de R$ 300,00. Adicione mais produtos para
                  liberar o checkout.
                </p>
              )}

              <button className="button-primary w-full opacity-60" disabled>
                Checkout em implementação
              </button>

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
