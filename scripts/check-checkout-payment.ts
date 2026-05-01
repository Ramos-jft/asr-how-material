import {
  OrderSource,
  OrderStatus,
  PaymentStatus,
  PrismaClient,
  StockMovementType,
} from "@prisma/client";

const prisma = new PrismaClient();

function formatCurrencyFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

async function getOrderCode(): Promise<string> {
  const orderCodeArg = process.argv[2]?.trim();

  if (orderCodeArg) {
    return orderCodeArg;
  }

  const latestOrder = await prisma.order.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      code: true,
    },
  });

  if (!latestOrder) {
    throw new Error(
      "Nenhum pedido encontrado. Informe um código de pedido ou crie um pedido antes de validar.",
    );
  }

  return latestOrder.code;
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
    return input.additionalDueCents;
  }

  return 0;
}

async function main() {
  const orderCode = await getOrderCode();

  const order = await prisma.order.findUnique({
    where: {
      code: orderCode,
    },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          status: true,
        },
      },
      items: true,
      payments: {
        where: {
          status: PaymentStatus.CONFIRMED,
        },
      },
      stockMovements: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Pedido não encontrado: ${orderCode}`);
  }

  const itemsTotalCents = order.items.reduce(
    (total, item) => total + item.lineTotalCents,
    0,
  );

  const confirmedPaymentsTotalCents = order.payments.reduce(
    (total, payment) => total + payment.receivedAmountCents,
    0,
  );

  const reserveMovements = order.stockMovements.filter(
    (movement) => movement.type === StockMovementType.RESERVE,
  );

  const cancelReleaseMovements = order.stockMovements.filter(
    (movement) => movement.type === StockMovementType.CANCEL_RELEASE,
  );

  const amountToPayCents = getAmountToPayCents({
    status: order.status,
    totalDueCents: order.totalDueCents,
    additionalDueCents: order.additionalDueCents,
  });

  console.table([
    {
      orderCode: order.code,
      source: order.source,
      status: order.status,
      customerEmail: order.customer?.email ?? "SEM CLIENTE",
      itemsCreated: order.items.length,
      itemsTotal: formatCurrencyFromCents(itemsTotalCents),
      orderSubtotal: formatCurrencyFromCents(order.subtotalCents),
      orderTotalDue: formatCurrencyFromCents(order.totalDueCents),
      amountToPay: formatCurrencyFromCents(amountToPayCents),
      confirmedPayments: order.payments.length,
      confirmedPaymentsTotal: formatCurrencyFromCents(
        confirmedPaymentsTotalCents,
      ),
      reserveMovements: reserveMovements.length,
      cancelReleaseMovements: cancelReleaseMovements.length,
      pixKeyConfigured: Boolean(process.env.PIX_KEY),
      pixQrCodeConfigured: Boolean(process.env.PIX_QR_CODE_URL),
    },
  ]);

  if (order.items.length === 0) {
    throw new Error("Pedido não possui itens gravados.");
  }

  if (order.source === OrderSource.ONLINE && reserveMovements.length === 0) {
    throw new Error(
      "Pedido online não possui movimentação RESERVE de estoque.",
    );
  }

  if (itemsTotalCents !== order.subtotalCents) {
    throw new Error(
      "Subtotal do pedido não bate com a soma dos itens gravados.",
    );
  }

  if (
    order.status === OrderStatus.PAID_CONFIRMED &&
    confirmedPaymentsTotalCents < order.totalDueCents
  ) {
    throw new Error(
      "Pedido está como pago, mas os pagamentos confirmados são menores que o total devido.",
    );
  }

  console.log("Fluxo de checkout/pagamento validado com sucesso.");
}

try {
  await main();
} catch (error) {
  console.error("Falha ao validar checkout/pagamento:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
