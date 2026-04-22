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

function createWhatsappHref(input: {
  phone: string;
  orderCode: string;
  totalDueCents: number;
}): string {
  const message = [
    "Olá! Segue comprovante do pedido:",
    input.orderCode,
    "",
    `Valor: ${formatCurrencyFromCents(input.totalDueCents)}`,
  ].join("\n");

  return `https://wa.me/${input.phone}?text=${encodeURIComponent(message)}`;
}

function isLocalImagePath(src: string): boolean {
  return src.startsWith("/");
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

  const whatsappHref = createWhatsappHref({
    phone: env.NEXT_PUBLIC_WHATSAPP_PHONE,
    orderCode: order.code,
    totalDueCents: order.totalDueCents,
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
              Faça o PIX no valor informado e envie o comprovante pelo WhatsApp.
              A confirmação do pagamento é manual pelo administrador.
            </p>
          </div>

          <Link className="button-secondary" href="/catalogo">
            Voltar ao catálogo
          </Link>
        </header>

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

                <span className="badge-muted">
                  {orderStatusLabels[order.status]}
                </span>
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
                  <dt className="font-medium text-slate-950">Valor devido</dt>
                  <dd>{formatCurrencyFromCents(order.totalDueCents)}</dd>
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

            <PixQrCode orderCode={order.code} />

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-950">
                Instruções para o cliente
              </p>

              <ol className="list-inside list-decimal space-y-1 leading-6">
                <li>Faça o PIX no valor exato do pedido.</li>
                <li>Informe o identificador {order.code} no comprovante.</li>
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
