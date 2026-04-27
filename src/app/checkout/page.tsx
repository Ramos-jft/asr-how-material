import type { Metadata } from "next";
import Link from "next/link";
import { CustomerStatus, ProductStatus, type Prisma } from "@prisma/client";
import { getActiveStoreWindow } from "@/lib/store-window";

import { createOrderAction } from "@/app/checkout/actions";
import {
  ORDER_MINIMUM_CENTS,
  type OrderPricingResult,
  calculateOrderPricing,
} from "@/domain/order-pricing";
import { requireAuth } from "@/lib/auth/guards";
import { type CartItem, getCartItems } from "@/lib/cart";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Revise seus dados, confirme o pedido e acesse as instruções de pagamento via PIX.",
};

type CheckoutPageProps = {
  searchParams: Promise<{
    erro?: string;
  }>;
};

const checkoutCustomerSelect = {
  name: true,
  email: true,
  phone: true,
  groupCode: true,
  status: true,
  temporaryPurchaseRemaining: true,
  address: {
    select: {
      zipCode: true,
      state: true,
      city: true,
      district: true,
      street: true,
      number: true,
      complement: true,
      reference: true,
    },
  },
} satisfies Prisma.CustomerSelect;

const checkoutProductSelect = {
  id: true,
  sku: true,
  name: true,
  retailPriceCents: true,
  stockCurrent: true,
  status: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

type CheckoutCustomer = Prisma.CustomerGetPayload<{
  select: typeof checkoutCustomerSelect;
}>;

type CheckoutProduct = Prisma.ProductGetPayload<{
  select: typeof checkoutProductSelect;
}>;

type CheckoutRow = {
  product: CheckoutProduct;
  quantity: number;
  lineTotalCents: number;
  isUnavailable: boolean;
};

type CheckoutSummaryProps = {
  pricing: OrderPricingResult;
  problems: string[];
  canCreateOrder: boolean;
};

function formatDate(date: Date | null): string {
  if (!date) return "Não se aplica";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

function getCustomerStatusLabel(status: CustomerStatus | undefined): string {
  if (status === CustomerStatus.APPROVED) return "Aprovado";
  if (status === CustomerStatus.TEMPORARY) return "Temporário";
  if (status === CustomerStatus.PENDING) return "Pendente";
  if (status === CustomerStatus.BLOCKED) return "Bloqueado";

  return "Não encontrado";
}

function isCustomerAllowedToBuy(input: {
  status: CustomerStatus | undefined;
  temporaryPurchaseRemaining: number | undefined;
}): boolean {
  if (input.status === CustomerStatus.APPROVED) return true;

  return (
    input.status === CustomerStatus.TEMPORARY &&
    (input.temporaryPurchaseRemaining ?? 0) > 0
  );
}

function isProductUnavailable(
  product: CheckoutProduct,
  quantity: number,
): boolean {
  return (
    !product.isActive ||
    product.status === ProductStatus.INACTIVE ||
    product.stockCurrent <= 0 ||
    product.stockCurrent < quantity
  );
}

function buildCheckoutRows(input: {
  cartItems: CartItem[];
  products: CheckoutProduct[];
}): CheckoutRow[] {
  return input.cartItems.flatMap((item) => {
    const product = input.products.find(
      (candidate) => candidate.id === item.productId,
    );

    if (!product) return [];

    return [
      {
        product,
        quantity: item.quantity,
        lineTotalCents: product.retailPriceCents * item.quantity,
        isUnavailable: isProductUnavailable(product, item.quantity),
      },
    ];
  });
}

function calculateSubtotal(rows: CheckoutRow[]): number {
  return rows.reduce((total, row) => total + row.lineTotalCents, 0);
}

function getMissingMinimumCents(subtotalCents: number): number {
  return Math.max(0, ORDER_MINIMUM_CENTS - subtotalCents);
}

function getCheckoutProblems(input: {
  customer: CheckoutCustomer | null;
  rows: CheckoutRow[];
  pricing: OrderPricingResult;
  missingMinimumCents: number;
}): string[] {
  const { customer, rows, pricing, missingMinimumCents } = input;

  const hasCustomerAllowedToBuy = isCustomerAllowedToBuy({
    status: customer?.status,
    temporaryPurchaseRemaining: customer?.temporaryPurchaseRemaining,
  });

  const problems = [
    customer ? null : "Cadastro de cliente não encontrado para este usuário.",
    customer && !hasCustomerAllowedToBuy
      ? "Seu cadastro ainda não está aprovado para finalizar compras."
      : null,
    customer && !customer.address
      ? "Endereço do cliente não encontrado."
      : null,
    rows.length === 0 ? "Seu carrinho está vazio." : null,
    pricing.isMinimumReached
      ? null
      : `Faltam ${formatCurrencyFromCents(missingMinimumCents)} para atingir o pedido mínimo.`,
    rows.some((row) => row.isUnavailable)
      ? "Um ou mais itens estão sem estoque suficiente. Volte ao carrinho e atualize as quantidades."
      : null,
  ];

  return problems.filter((problem): problem is string => Boolean(problem));
}

function CheckoutHeader() {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        <span className="badge-brand">Checkout</span>

        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          Finalizar pedido
        </h1>

        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Revise os dados antes de criar o pedido. Ao confirmar, o sistema
          reserva o estoque e libera as instruções de pagamento via PIX.
        </p>
      </div>

      <Link className="button-secondary" href="/carrinho">
        Voltar ao carrinho
      </Link>
    </header>
  );
}

function CheckoutErrorAlert({ error }: Readonly<{ error?: string }>) {
  if (!error) return null;

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
      {error}
    </div>
  );
}

function CustomerSection({
  customer,
}: Readonly<{ customer: CheckoutCustomer | null }>) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Cliente</h2>
          <p className="text-sm text-slate-500">
            Validação de autorização para compra.
          </p>
        </div>

        <span className="badge-muted">
          {getCustomerStatusLabel(customer?.status)}
        </span>
      </div>

      {customer ? (
        <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-950">Nome</dt>
            <dd>{customer.name}</dd>
          </div>

          <div>
            <dt className="font-medium text-slate-950">E-mail</dt>
            <dd>{customer.email}</dd>
          </div>

          <div>
            <dt className="font-medium text-slate-950">WhatsApp</dt>
            <dd>{customer.phone}</dd>
          </div>

          <div>
            <dt className="font-medium text-slate-950">Grupo</dt>
            <dd>{customer.groupCode}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-slate-600">
          Nenhum cadastro de cliente foi vinculado ao usuário logado.
        </p>
      )}
    </section>
  );
}

function AddressSection({
  customer,
}: Readonly<{ customer: CheckoutCustomer | null }>) {
  const address = customer?.address;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-xl font-semibold text-slate-950">Endereço</h2>

      {address ? (
        <address className="not-italic text-sm leading-6 text-slate-700">
          {address.street}, {address.number}
          {address.complement ? ` - ${address.complement}` : ""}
          <br />
          {address.district} - {address.city}/{address.state}
          <br />
          CEP {address.zipCode}
          {address.reference ? (
            <>
              <br />
              Referência: {address.reference}
            </>
          ) : null}
        </address>
      ) : (
        <p className="text-sm text-slate-600">Endereço não encontrado.</p>
      )}
    </section>
  );
}

function CheckoutItemCard({ row }: Readonly<{ row: CheckoutRow }>) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-950">{row.product.name}</h3>

          <p className="text-sm text-slate-500">SKU {row.product.sku}</p>

          {row.isUnavailable ? (
            <p className="text-sm font-medium text-red-700">
              Estoque insuficiente ou produto indisponível.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Estoque atual: {row.product.stockCurrent}
            </p>
          )}
        </div>

        <div className="text-left sm:text-right">
          <p className="text-sm text-slate-500">
            {row.quantity} un. ×{" "}
            {formatCurrencyFromCents(row.product.retailPriceCents)}
          </p>

          <p className="font-semibold text-slate-950">
            {formatCurrencyFromCents(row.lineTotalCents)}
          </p>
        </div>
      </div>
    </article>
  );
}

function CheckoutItemsSection({ rows }: Readonly<{ rows: CheckoutRow[] }>) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Itens do pedido
        </h2>
        <p className="text-sm text-slate-500">
          O estoque será validado novamente no momento da criação do pedido.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mini-card">
          Seu carrinho está vazio ou possui produtos indisponíveis.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <CheckoutItemCard key={row.product.id} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

function CheckoutProblems({ problems }: Readonly<{ problems: string[] }>) {
  if (problems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <p className="font-semibold">Antes de finalizar:</p>

      <ul className="mt-2 list-inside list-disc">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </div>
  );
}

function CheckoutDiscountNotice({
  pricing,
}: Readonly<{ pricing: OrderPricingResult }>) {
  if (pricing.discountCentsApplied <= 0) return null;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
      Desconto válido até {formatDate(pricing.discountExpiresAt)}. Após esse
      prazo, poderá haver complemento.
    </div>
  );
}

function CheckoutSubmitArea({
  canCreateOrder,
}: Readonly<{ canCreateOrder: boolean }>) {
  if (!canCreateOrder) {
    return (
      <Link className="button-secondary w-full" href="/carrinho">
        Ajustar carrinho
      </Link>
    );
  }

  return (
    <form action={createOrderAction}>
      <button className="button-primary w-full" type="submit">
        Criar pedido e reservar estoque
      </button>
    </form>
  );
}

function CheckoutSummary({
  pricing,
  problems,
  canCreateOrder,
}: Readonly<CheckoutSummaryProps>) {
  return (
    <aside className="h-fit space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-xl font-semibold text-slate-950">
        Resumo financeiro
      </h2>

      <div className="space-y-3 text-sm text-slate-700">
        <div className="flex justify-between gap-4">
          <span>Subtotal</span>
          <strong>{formatCurrencyFromCents(pricing.subtotalCents)}</strong>
        </div>

        <div className="flex justify-between gap-4">
          <span>Desconto</span>
          <strong>
            {formatCurrencyFromCents(pricing.discountCentsApplied)}
          </strong>
        </div>

        <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base text-slate-950">
          <span>Total via PIX</span>
          <strong>{formatCurrencyFromCents(pricing.totalDueCents)}</strong>
        </div>
      </div>

      <CheckoutDiscountNotice pricing={pricing} />
      <CheckoutProblems problems={problems} />
      <CheckoutSubmitArea canCreateOrder={canCreateOrder} />

      <p className="text-xs leading-5 text-slate-500">
        Após criar o pedido, você verá a chave PIX, o valor devido e o
        identificador para envio do comprovante.
      </p>
    </aside>
  );
}

export default async function CheckoutPage({
  searchParams,
}: Readonly<CheckoutPageProps>) {
  const [{ user }, params] = await Promise.all([requireAuth(), searchParams]);
  const [cartItems, activeStoreWindow] = await Promise.all([
    getCartItems(),
    getActiveStoreWindow(),
  ]);

  const [customer, products] = await Promise.all([
    prisma.customer.findUnique({
      where: {
        userId: user.id,
      },
      select: checkoutCustomerSelect,
    }),
    prisma.product.findMany({
      where: {
        id: {
          in: cartItems.map((item) => item.productId),
        },
      },
      orderBy: {
        name: "asc",
      },
      select: checkoutProductSelect,
    }),
  ]);

  const rows = buildCheckoutRows({ cartItems, products });
  const subtotalCents = calculateSubtotal(rows);
  const pricing = calculateOrderPricing(subtotalCents);
  const missingMinimumCents = getMissingMinimumCents(subtotalCents);

  const problems = getCheckoutProblems({
    customer,
    rows,
    pricing,
    missingMinimumCents,
  });

  const checkoutProblems = activeStoreWindow
    ? problems
    : [
        "A loja está fora do período de vendas. O catálogo permanece disponível, mas o checkout está bloqueado.",
        ...problems,
      ];

  return (
    <main className="page-shell items-start">
      <section className="panel w-full space-y-8">
        <CheckoutHeader />
        <CheckoutErrorAlert error={params.erro} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <CustomerSection customer={customer} />
            <AddressSection customer={customer} />
            <CheckoutItemsSection rows={rows} />
          </div>

          <CheckoutSummary
            pricing={pricing}
            problems={checkoutProblems}
            canCreateOrder={checkoutProblems.length === 0}
          />
        </div>
      </section>
    </main>
  );
}
