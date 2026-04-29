import type { Metadata } from "next";
import { ProductStatus } from "@prisma/client";

import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PDV",
  description: "Tela inicial do ponto de venda.",
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export default async function AdminPdvPage() {
  await requirePermission(PERMISSIONS.PDV_CREATE_ORDER);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      status: ProductStatus.ACTIVE,
      stockCurrent: {
        gt: 0,
      },
    },
    orderBy: {
      name: "asc",
    },
    take: 50,
    select: {
      id: true,
      sku: true,
      name: true,
      retailPriceCents: true,
      stockCurrent: true,
      unit: true,
    },
  });

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="badge-brand">PDV</span>

        <div className="mt-4 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            Ponto de venda
          </h2>

          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Tela inicial para operação em eventos. Nesta etapa, o PDV lista
            produtos disponíveis e prepara a operação sem criar venda ainda.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <h3 className="font-semibold">Próxima etapa do PDV</h3>

        <p className="mt-2">
          A criação de venda PDV deve ser implementada com cuidado para baixar
          estoque, registrar pedido com origem <strong>PDV</strong>, pagamento
          em dinheiro/PIX e movimentação <strong>PDV_SALE</strong>. Por
          segurança, esta tela ainda não altera estoque.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Produtos disponíveis para venda
        </h3>

        {products.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Nenhum produto ativo com estoque disponível.
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
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Preço
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Estoque
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Unidade
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 align-top font-semibold text-slate-950">
                      {product.name}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-600">
                      {product.sku}
                    </td>

                    <td className="px-4 py-3 align-top font-semibold text-slate-950">
                      {formatCurrency(product.retailPriceCents)}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-700">
                      {product.stockCurrent}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-600">
                      {product.unit ?? "un."}
                    </td>
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
