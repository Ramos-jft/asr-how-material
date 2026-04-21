import { ProductStatus } from "@prisma/client";

export function getProductStatus(input: {
  isActive: boolean;
  stockCurrent: number;
}): ProductStatus {
  if (!input.isActive) {
    return ProductStatus.INACTIVE;
  }

  if (input.stockCurrent <= 0) {
    return ProductStatus.OUT_OF_STOCK;
  }

  return ProductStatus.ACTIVE;
}
