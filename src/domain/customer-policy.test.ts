import { describe, expect, it } from "vitest";

import {
  canCustomerBuy,
  getTemporaryPurchaseRemainingForStatus,
  TEMPORARY_CUSTOMER_INITIAL_PURCHASES,
} from "./customer-policy";

describe("canCustomerBuy", () => {
  it("permite compra para cliente aprovado", () => {
    const result = canCustomerBuy({
      status: "APPROVED",
      temporaryPurchaseRemaining: 0,
    });

    expect(result.canBuy).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("permite compra para cliente temporário com uma compra restante", () => {
    const result = canCustomerBuy({
      status: "TEMPORARY",
      temporaryPurchaseRemaining: 1,
    });

    expect(result.canBuy).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("bloqueia cliente temporário sem compras restantes", () => {
    const result = canCustomerBuy({
      status: "TEMPORARY",
      temporaryPurchaseRemaining: 0,
    });

    expect(result.canBuy).toBe(false);
    expect(result.reason).toBe(
      "Cliente temporário já utilizou a compra permitida.",
    );
  });

  it("bloqueia cliente pendente", () => {
    const result = canCustomerBuy({
      status: "PENDING",
      temporaryPurchaseRemaining: 0,
    });

    expect(result.canBuy).toBe(false);
    expect(result.reason).toBe("Cadastro aguardando aprovação manual.");
  });

  it("bloqueia cliente bloqueado", () => {
    const result = canCustomerBuy({
      status: "BLOCKED",
      temporaryPurchaseRemaining: 0,
    });

    expect(result.canBuy).toBe(false);
    expect(result.reason).toBe("Cadastro bloqueado.");
  });

  it("rejeita quantidade temporária inválida", () => {
    expect(() =>
      canCustomerBuy({
        status: "TEMPORARY",
        temporaryPurchaseRemaining: 0.5,
      }),
    ).toThrow("Quantidade temporária de compras inválida.");

    expect(() =>
      canCustomerBuy({
        status: "TEMPORARY",
        temporaryPurchaseRemaining: -1,
      }),
    ).toThrow("Quantidade temporária de compras não pode ser negativa.");
  });
});

describe("getTemporaryPurchaseRemainingForStatus", () => {
  it("retorna 1 compra para cliente temporário", () => {
    expect(getTemporaryPurchaseRemainingForStatus("TEMPORARY")).toBe(
      TEMPORARY_CUSTOMER_INITIAL_PURCHASES,
    );
  });

  it("retorna 0 para os demais status", () => {
    expect(getTemporaryPurchaseRemainingForStatus("PENDING")).toBe(0);
    expect(getTemporaryPurchaseRemainingForStatus("APPROVED")).toBe(0);
    expect(getTemporaryPurchaseRemainingForStatus("BLOCKED")).toBe(0);
  });
});
