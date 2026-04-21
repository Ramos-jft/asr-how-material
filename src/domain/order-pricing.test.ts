import { describe, expect, it } from "vitest";

import {
  calculateComplementDue,
  calculateOrderPricing,
  ORDER_MINIMUM_CENTS,
} from "./order-pricing";

describe("calculateOrderPricing", () => {
  it("bloqueia pedido abaixo do mínimo", () => {
    const result = calculateOrderPricing(ORDER_MINIMUM_CENTS - 1);

    expect(result.isMinimumReached).toBe(false);
    expect(result.discountCentsApplied).toBe(0);
  });

  it("permite pedido no valor mínimo exato", () => {
    const result = calculateOrderPricing(ORDER_MINIMUM_CENTS);

    expect(result.isMinimumReached).toBe(true);
    expect(result.totalDueCents).toBe(ORDER_MINIMUM_CENTS);
  });

  it("não aplica desconto em pedido de exatamente R$ 1.000,00", () => {
    const result = calculateOrderPricing(100_000);

    expect(result.discountCentsApplied).toBe(0);
    expect(result.totalDueCents).toBe(100_000);
    expect(result.discountExpiresAt).toBeNull();
  });

  it("aplica 10% de desconto acima de R$ 1.000,00", () => {
    const createdAt = new Date("2026-04-21T12:00:00.000Z");

    const result = calculateOrderPricing(120_000, createdAt);

    expect(result.discountCentsApplied).toBe(12_000);
    expect(result.totalDueCents).toBe(108_000);
    expect(result.discountExpiresAt?.toISOString()).toBe(
      "2026-04-28T12:00:00.000Z",
    );
  });

  it("rejeita subtotal inválido", () => {
    expect(() => calculateOrderPricing(-1)).toThrow("Subtotal inválido.");
    expect(() => calculateOrderPricing(10.5)).toThrow("Subtotal inválido.");
  });
});

describe("calculateComplementDue", () => {
  it("retorna zero quando pagamento cobre o total devido", () => {
    const result = calculateComplementDue({
      subtotalCents: 120_000,
      totalDueCents: 108_000,
      receivedAmountCents: 108_000,
    });

    expect(result).toBe(0);
  });

  it("calcula complemento quando pagamento é insuficiente", () => {
    const result = calculateComplementDue({
      subtotalCents: 120_000,
      totalDueCents: 120_000,
      receivedAmountCents: 108_000,
    });

    expect(result).toBe(12_000);
  });
});
