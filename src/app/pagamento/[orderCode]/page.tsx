import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { env } from "@/lib/env";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PaymentPageProps = {
  params: Promise<{
    orderCode: string;
  }>;
};

const orderStatusLabels = {
  [OrderStatus.AWAITING_PAYMENT]: "Aguardando pagamento",
  [OrderStatus.PENDING_COMPLEMENT]: "Pendente complemento",
  [OrderStatus.PAID_CONFIRMED]: "Pago confirmado",
  [OrderStatus.SHIPPED]: "Enviado",
  [OrderStatus.COMPLETED]: "Concluído",
  [OrderStatus.CANCELLED]: "Cancelado",
} satisfies Record<OrderStatus, string>;

const orderStatusClassNames = {
  [OrderStatus.AWAITING_PAYMENT]: "border-amber-200 bg-amber-50 text-amber-800",
  [OrderStatus.PENDING_COMPLEMENT]:
    "border-orange-200 bg-orange-50 text-orange-800",
  [OrderStatus.PAID_CONFIRMED]:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  [OrderStatus.SHIPPED]: "border-blue-200 bg-blue-50 text-blue-800",
  [OrderStatus.COMPLETED]: "border-slate-200 bg-slate-100 text-slate-700",
  [OrderStatus.CANCELLED]: "border-red-200 bg-red-50 text-red-700",
} satisfies Record<OrderStatus, string>;

export async function generateMetadata({
  params,
}: Readonly<PaymentPageProps>): Promise<Metadata> {
  const { orderCode } = await params;

  return {
    title: `Pagamento ${orderCode}`,
    description: "Instruções de pagamento PIX do pedido.",
  };
}

function formatDate(date: Date | null): string {
  if (!date) return "Não se aplica";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

function getAmountToPayCents(input: {
  status: OrderStatus;
  totalDueCents: number;
  additionalDueCents: number;
}): number {
  if (input.status === OrderStatus.AWAITING_PAYMENT) {
    return input.totalDueCents;
  }

  if (input.status === OrderStatus.PENDING_COMPLEMENT) {
    return Math.max(0, input.additionalDueCents);
  }

  return 0;
}

function canSendPaymentProof(status: OrderStatus): boolean {
  return (
    status === OrderStatus.AWAITING_PAYMENT ||
    status === OrderStatus.PENDING_COMPLEMENT
  );
}

function getPaymentInstruction(input: {
  status: OrderStatus;
  amountToPayCents: number;
}): string {
  if (input.status === OrderStatus.AWAITING_PAYMENT) {
    return `Faça o PIX no valor de ${formatCurrencyFromCents(
      input.amountToPayCents,
    )} e envie o comprovante pelo WhatsApp.`;
  }

  if (input.status === OrderStatus.PENDING_COMPLEMENT) {
    return `Este pedido possui complemento pendente. Faça o PIX somente do valor complementar: ${formatCurrencyFromCents(
      input.amountToPayCents,
    )}.`;
  }

  if (input.status === OrderStatus.PAID_CONFIRMED) {
    return "Pagamento confirmado. Não é necessário enviar novo PIX.";
  }

  if (input.status === OrderStatus.SHIPPED) {
    return "Pedido enviado. Não é necessário enviar novo PIX.";
  }

  if (input.status === OrderStatus.COMPLETED) {
    return "Pedido concluído. Não é necessário enviar novo PIX.";
  }

  return "Pedido cancelado. Não realize pagamento para este pedido.";
}

function getWhatsappPaymentLabel(status: OrderStatus): string {
  if (status === OrderStatus.PENDING_COMPLEMENT) {
    return "Valor complementar";
  }

  return "Valor";
}

function createWhatsappHref(input: {
  phone: string;
  orderCode: string;
  amountToPayCents: number;
  status: OrderStatus;
}): string {
  const paymentLabel = getWhatsappPaymentLabel(input.status);

  const message = [
    "Olá! Segue comprovante do pedido:",
    input.orderCode,
    "",
    `${paymentLabel}: ${formatCurrencyFromCents(input.amountToPayCents)}`,
  ].join("\n");

  return `https://wa.me/${input.phone}?text=${encodeURIComponent(message)}`;
}

function isLocalImagePath(src: string): boolean {
  return src.startsWith("/");
}

function OrderStatusBadge({ status }: Readonly<{ status: OrderStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusClassNames[status]}`}
    >
      {orderStatusLabels[status]}
    </span>
  );
}

function PixQrCode({ orderCode }: Readonly<{ orderCode: string }>) {
  const qrCodeUrl = env.PIX_QR_CODE_URL;

  if (!qrCodeUrl) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        QR Code não configurado. Use a chave PIX informada.
      </div>
    );
  }

  if (!isLocalImagePath(qrCodeUrl)) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <p className="font-medium">QR Code configurado como URL externa.</p>

        <p>
          Para exibir com otimização do Next, configure o domínio em{" "}
          <code>remotePatterns</code> no <code>next.config.ts</code>.
        </p>

        <a
          className="mt-3 inline-flex font-semibold text-blue-900 underline"
          href={qrCodeUrl}
          target="_blank"
          rel="noreferrer"
        >
          Abrir QR Code PIX
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <Image
        src={qrCodeUrl}
        alt={`QR Code PIX do pedido ${orderCode}`}
        width={256}
        height={256}
        className="mx-auto aspect-square w-full max-w-64 rounded-2xl object-contain"
      />
    </div>
  );
}

function PixKeyInfo() {
  if (!env.PIX_KEY) {
    return (
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Configure a variável <strong>PIX_KEY</strong> no arquivo de ambiente
        antes de usar em produção.
      </div>
    );
  }

  return null;
}

function getPaymentStatusNoticeClassName(status: OrderStatus): string {
  if (status === OrderStatus.CANCELLED) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (canSendPaymentProof(status)) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function PaymentStatusNotice({
  status,
  amountToPayCents,
}: Readonly<{
  status: OrderStatus;
  amountToPayCents: number;
}>) {
  const instruction = getPaymentInstruction({
    status,
    amountToPayCents,
  });

  const className = getPaymentStatusNoticeClassName(status);

  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${className}`}>
      {instruction}
    </div>
  );
}

export default async function PaymentPage({
  params,
}: Readonly<PaymentPageProps>) {
  const [{ orderCode }, auth] = await Promise.all([params, requireAuth()]);

  const order = await prisma.order.findUnique({
    where: {
      code: orderCode,
    },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
          userId: true,
        },
      },
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
      payments: {
        where: {
          status: "CONFIRMED",
        },
        select: {
          id: true,
          method: true,
          receivedAmountCents: true,
          confirmedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const canReadOrder =
    order.customer?.userId === auth.user.id ||
    auth.permissions.includes(PERMISSIONS.ORDERS_READ);

  if (!canReadOrder) {
    redirect("/acesso-negado");
  }

  const amountToPayCents = getAmountToPayCents({
    status: order.status,
    totalDueCents: order.totalDueCents,
    additionalDueCents: order.additionalDueCents,
  });

  const canSendProof = canSendPaymentProof(order.status);
  const confirmedPaymentsTotalCents = order.payments.reduce(
    (total, payment) => total + payment.receivedAmountCents,
    0,
  );

  const whatsappHref = createWhatsappHref({
    phone: env.NEXT_PUBLIC_WHATSAPP_PHONE,
    orderCode: order.code,
    amountToPayCents,
    status: order.status,
  });

  return (
    <main className="page-shell items-start">
      <section className="panel w-full space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="badge-brand">Pagamento PIX</span>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Pedido {order.code}
            </h1>

            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Consulte o status do pedido e envie o comprovante pelo WhatsApp
              somente quando houver valor pendente.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" href="/pedidos">
              Meus pedidos
            </Link>

            <Link className="button-secondary" href="/catalogo">
              Voltar ao catálogo
            </Link>
          </div>
        </header>

        <PaymentStatusNotice
          status={order.status}
          amountToPayCents={amountToPayCents}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Status do pedido
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {orderStatusLabels[order.status]}
                  </p>
                </div>

                <OrderStatusBadge status={order.status} />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-xl font-semibold text-slate-950">
                Dados do pagamento
              </h2>

              <dl className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-950">
                    Identificador do pedido
                  </dt>
                  <dd>{order.code}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-950">
                    Total do pedido
                  </dt>
                  <dd>{formatCurrencyFromCents(order.totalDueCents)}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-950">
                    Valor já confirmado
                  </dt>
                  <dd>
                    {formatCurrencyFromCents(confirmedPaymentsTotalCents)}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-950">
                    Valor pendente para PIX
                  </dt>
                  <dd>{formatCurrencyFromCents(amountToPayCents)}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-950">Subtotal</dt>
                  <dd>{formatCurrencyFromCents(order.subtotalCents)}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-950">
                    Desconto aplicado
                  </dt>
                  <dd>{formatCurrencyFromCents(order.discountCentsApplied)}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-950">
                    Validade do desconto
                  </dt>
                  <dd>{formatDate(order.discountExpiresAt)}</dd>
                </div>

                <div>
                  <dt className="font-medium text-slate-950">Chave PIX</dt>
                  <dd>
                    {env.PIX_KEY ?? "Chave PIX não configurada no ambiente."}
                  </dd>
                </div>
              </dl>

              <PixKeyInfo />
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Itens do pedido
                </h2>

                <p className="text-sm text-slate-500">
                  Os preços abaixo são snapshots gravados no momento da criação
                  do pedido.
                </p>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <article
                    className="rounded-3xl border border-slate-200 bg-white p-5"
                    key={item.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-950">
                          {item.name}
                        </h3>

                        <p className="text-sm text-slate-500">SKU {item.sku}</p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-sm text-slate-500">
                          {item.quantity} un. ×{" "}
                          {formatCurrencyFromCents(item.unitPriceCents)}
                        </p>

                        <p className="font-semibold text-slate-950">
                          {formatCurrencyFromCents(item.lineTotalCents)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-slate-950">
              Enviar comprovante
            </h2>

            {canSendProof ? (
              <>
                <PixQrCode orderCode={order.code} />

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-950">
                    Instruções para o cliente
                  </p>

                  <ol className="list-inside list-decimal space-y-1 leading-6">
                    <li>
                      Faça o PIX no valor de{" "}
                      <strong>
                        {formatCurrencyFromCents(amountToPayCents)}
                      </strong>
                      .
                    </li>
                    <li>
                      Informe o identificador {order.code} no comprovante.
                    </li>
                    <li>Envie o comprovante pelo WhatsApp.</li>
                    <li>Aguarde a confirmação manual do administrador.</li>
                  </ol>
                </div>

                <a
                  className="button-primary w-full"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar comprovante
                </a>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                Este pedido não possui valor pendente para pagamento via PIX no
                momento.
              </div>
            )}

            <p className="text-xs leading-5 text-slate-500">
              O sistema não confirma PIX automaticamente neste MVP. O admin
              deverá conferir o comprovante e marcar o pedido como pago.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
