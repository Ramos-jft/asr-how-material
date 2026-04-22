export type PaymentConfirmationStatus = "PENDING_COMPLEMENT" | "PAID_CONFIRMED";

export type ResolvePaymentConfirmationInput = {
  totalDueCents: number;
  receivedAmountCents: number;
  previouslyReceivedCents?: number;
};

export type ResolvePaymentConfirmationResult = {
  totalReceivedCents: number;
  additionalDueCents: number;
  nextStatus: PaymentConfirmationStatus;
  isFullyPaid: boolean;
};

function assertMoneyInCents(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${fieldName} deve ser um valor inteiro em centavos.`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} não pode ser negativo.`);
  }
}

export function resolvePaymentConfirmation(
  input: ResolvePaymentConfirmationInput,
): ResolvePaymentConfirmationResult {
  const previouslyReceivedCents = input.previouslyReceivedCents ?? 0;

  assertMoneyInCents(input.totalDueCents, "totalDueCents");
  assertMoneyInCents(input.receivedAmountCents, "receivedAmountCents");
  assertMoneyInCents(previouslyReceivedCents, "previouslyReceivedCents");

  const totalReceivedCents =
    previouslyReceivedCents + input.receivedAmountCents;

  const additionalDueCents = Math.max(
    0,
    input.totalDueCents - totalReceivedCents,
  );

  const isFullyPaid = additionalDueCents === 0;

  return {
    totalReceivedCents,
    additionalDueCents,
    nextStatus: isFullyPaid ? "PAID_CONFIRMED" : "PENDING_COMPLEMENT",
    isFullyPaid,
  };
}
