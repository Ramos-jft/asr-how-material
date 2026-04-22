import { describe, expect, it } from "vitest";

import { resolvePaymentConfirmation } from "./order-payment";

describe("resolvePaymentConfirmation", () => {
  it("marca pedido como pago quando o valor recebido cobre o total devido", () => {
    const result = resolvePaymentConfirmation({
      totalDueCents: 108_000,
      receivedAmountCents: 108_000,
    });

    expect(result.totalReceivedCents).toBe(108_000);
    expect(result.additionalDueCents).toBe(0);
    expect(result.nextStatus).toBe("PAID_CONFIRMED");
    expect(result.isFullyPaid).toBe(true);
  });

  it("marca pedido como pendente complemento quando o valor recebido é insuficiente", () => {
    const result = resolvePaymentConfirmation({
      totalDueCents: 120_000,
      receivedAmountCents: 108_000,
    });

    expect(result.totalReceivedCents).toBe(108_000);
    expect(result.additionalDueCents).toBe(12_000);
    expect(result.nextStatus).toBe("PENDING_COMPLEMENT");
    expect(result.isFullyPaid).toBe(false);
  });

  it("considera pagamentos já confirmados anteriormente", () => {
    const result = resolvePaymentConfirmation({
      totalDueCents: 120_000,
      previouslyReceivedCents: 80_000,
      receivedAmountCents: 40_000,
    });

    expect(result.totalReceivedCents).toBe(120_000);
    expect(result.additionalDueCents).toBe(0);
    expect(result.nextStatus).toBe("PAID_CONFIRMED");
  });

  it("rejeita valores monetários inválidos", () => {
    expect(() =>
      resolvePaymentConfirmation({
        totalDueCents: 120_000.5,
        receivedAmountCents: 100_000,
      }),
    ).toThrow("totalDueCents deve ser um valor inteiro em centavos.");

    expect(() =>
      resolvePaymentConfirmation({
        totalDueCents: 120_000,
        receivedAmountCents: -1,
      }),
    ).toThrow("receivedAmountCents não pode ser negativo.");
  });
});
