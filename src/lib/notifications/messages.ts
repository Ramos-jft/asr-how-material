import type { CustomerStatus, OrderStatus } from "@prisma/client";

type CustomerMessageInput = {
  customerName: string;
  storeName: string;
};

type OrderMessageInput = {
  customerName: string;
  orderCode: string;
  total: string;
  storeName: string;
};

export function customerStatusMessage(
  status: CustomerStatus,
  input: CustomerMessageInput,
): string {
  const greeting = `Olá, ${input.customerName}.`;

  if (status === "APPROVED") {
    return `${greeting} Seu cadastro na ${input.storeName} foi aprovado. Você já pode acessar sua conta e realizar pedidos.`;
  }

  if (status === "TEMPORARY") {
    return `${greeting} Seu cadastro na ${input.storeName} foi liberado temporariamente para uma compra.`;
  }

  if (status === "BLOCKED") {
    return `${greeting} Seu cadastro na ${input.storeName} está bloqueado. Entre em contato com a administração para mais informações.`;
  }

  return `${greeting} Seu cadastro na ${input.storeName} está em análise.`;
}

export function orderCreatedMessage(input: OrderMessageInput): string {
  return `Olá, ${input.customerName}. Seu pedido ${input.orderCode} foi criado na ${input.storeName}. Valor: ${input.total}. Acesse a área do comprador para ver as instruções de pagamento.`;
}

export function pixInstructionsMessage(input: OrderMessageInput): string {
  return `Olá, ${input.customerName}. Para concluir o pedido ${input.orderCode}, realize o PIX no valor de ${input.total} e envie o comprovante para conferência.`;
}

export function orderStatusMessage(
  status: OrderStatus,
  input: OrderMessageInput,
): string {
  if (status === "PAID_CONFIRMED") {
    return `Olá, ${input.customerName}. O pagamento do pedido ${input.orderCode} foi confirmado.`;
  }

  if (status === "SHIPPED") {
    return `Olá, ${input.customerName}. O pedido ${input.orderCode} foi enviado.`;
  }

  if (status === "COMPLETED") {
    return `Olá, ${input.customerName}. O pedido ${input.orderCode} foi concluído.`;
  }

  if (status === "CANCELLED") {
    return `Olá, ${input.customerName}. O pedido ${input.orderCode} foi cancelado.`;
  }

  if (status === "PENDING_COMPLEMENT") {
    return `Olá, ${input.customerName}. O pedido ${input.orderCode} está com complemento pendente. Verifique as instruções na área do comprador.`;
  }

  return `Olá, ${input.customerName}. O pedido ${input.orderCode} foi atualizado.`;
}

export function storeWindowMessage(isOpen: boolean, storeName: string): string {
  return isOpen
    ? `${storeName}: a loja está aberta para pedidos.`
    : `${storeName}: a loja está fechada para novos pedidos no momento.`;
}
