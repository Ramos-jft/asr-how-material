import "server-only";

import { randomUUID } from "node:crypto";

const ORDER_CODE_PREFIX = "ASR";
const RANDOM_CODE_LENGTH = 6;

export function createOrderCode(date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = randomUUID()
    .replaceAll("-", "")
    .slice(0, RANDOM_CODE_LENGTH)
    .toUpperCase();

  return `${ORDER_CODE_PREFIX}-${datePart}-${randomPart}`;
}
