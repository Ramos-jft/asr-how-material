export const ORDER_MINIMUM_CENTS = 30_000;
export const ORDER_DISCOUNT_THRESHOLD_CENTS = 100_000;
export const ORDER_DISCOUNT_PERCENTAGE = 10;
export const ORDER_DISCOUNT_DEADLINE_DAYS = 7;

export type OrderPricingResult = {
  subtotalCents: number;
  discountCentsApplied: number;
  totalDueCents: number;
  discountExpiresAt: Date | null;
  isMinimumReached: boolean;
};

export function calculateOrderPricing(
  subtotalCents: number,
  createdAt = new Date(),
): OrderPricingResult {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new Error("Subtotal inválido.");
  }

  const isMinimumReached = subtotalCents >= ORDER_MINIMUM_CENTS;
  const shouldApplyDiscount = subtotalCents > ORDER_DISCOUNT_THRESHOLD_CENTS;

  const discountCentsApplied = shouldApplyDiscount
    ? Math.round((subtotalCents * ORDER_DISCOUNT_PERCENTAGE) / 100)
    : 0;

  const discountExpiresAt = shouldApplyDiscount
    ? addDays(createdAt, ORDER_DISCOUNT_DEADLINE_DAYS)
    : null;

  return {
    subtotalCents,
    discountCentsApplied,
    totalDueCents: subtotalCents - discountCentsApplied,
    discountExpiresAt,
    isMinimumReached,
  };
}

export function calculateComplementDue(input: {
  subtotalCents: number;
  totalDueCents: number;
  receivedAmountCents: number;
}): number {
  const { subtotalCents, totalDueCents, receivedAmountCents } = input;

  if (
    !Number.isInteger(subtotalCents) ||
    !Number.isInteger(totalDueCents) ||
    !Number.isInteger(receivedAmountCents)
  ) {
    throw new TypeError("Valores monetários inválidos.");
  }

  if (subtotalCents < 0 || totalDueCents < 0 || receivedAmountCents < 0) {
    throw new Error("Valores monetários não podem ser negativos.");
  }

  return Math.max(0, totalDueCents - receivedAmountCents);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}
