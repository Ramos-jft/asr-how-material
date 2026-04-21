export const TEMPORARY_CUSTOMER_INITIAL_PURCHASES = 1;

export type CustomerPolicyStatus =
  | "PENDING"
  | "TEMPORARY"
  | "APPROVED"
  | "BLOCKED";

export type CustomerPurchasePolicyInput = {
  status: CustomerPolicyStatus;
  temporaryPurchaseRemaining: number;
};

export type CustomerPurchasePolicyResult = {
  canBuy: boolean;
  reason: string | null;
};

export function canCustomerBuy(
  input: CustomerPurchasePolicyInput,
): CustomerPurchasePolicyResult {
  if (!Number.isInteger(input.temporaryPurchaseRemaining)) {
    throw new TypeError("Quantidade temporária de compras inválida.");
  }

  if (input.temporaryPurchaseRemaining < 0) {
    throw new Error("Quantidade temporária de compras não pode ser negativa.");
  }

  if (input.status === "APPROVED") {
    return {
      canBuy: true,
      reason: null,
    };
  }

  if (input.status === "TEMPORARY" && input.temporaryPurchaseRemaining > 0) {
    return {
      canBuy: true,
      reason: null,
    };
  }

  if (input.status === "TEMPORARY") {
    return {
      canBuy: false,
      reason: "Cliente temporário já utilizou a compra permitida.",
    };
  }

  if (input.status === "PENDING") {
    return {
      canBuy: false,
      reason: "Cadastro aguardando aprovação manual.",
    };
  }

  if (input.status === "BLOCKED") {
    return {
      canBuy: false,
      reason: "Cadastro bloqueado.",
    };
  }

  return {
    canBuy: false,
    reason: "Status de cliente inválido.",
  };
}

export function getTemporaryPurchaseRemainingForStatus(
  status: CustomerPolicyStatus,
): number {
  if (status === "TEMPORARY") {
    return TEMPORARY_CUSTOMER_INITIAL_PURCHASES;
  }

  return 0;
}

export function isCustomerStatusAllowed(
  status: string,
): status is CustomerPolicyStatus {
  return ["PENDING", "TEMPORARY", "APPROVED", "BLOCKED"].includes(status);
}
