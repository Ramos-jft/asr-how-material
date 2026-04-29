import "server-only";

import { cookies } from "next/headers";

const PDV_CART_COOKIE_NAME = "asr_pdv_cart";
const MAX_ITEM_QUANTITY = 999;
const MAX_UNIT_PRICE_CENTS = 99_999_999;

export type PdvCartItem = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  overrideReason: string | null;
};

type PdvCartCookiePayload = [string, number, number, string | null][];

function isPdvCartCookiePayload(value: unknown): value is PdvCartCookiePayload {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 4 &&
        typeof item[0] === "string" &&
        Number.isInteger(item[1]) &&
        Number.isInteger(item[2]) &&
        (typeof item[3] === "string" || item[3] === null),
    )
  );
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return 0;
  }

  return Math.min(quantity, MAX_ITEM_QUANTITY);
}

function normalizeUnitPrice(unitPriceCents: number): number {
  if (!Number.isInteger(unitPriceCents) || unitPriceCents <= 0) {
    return 0;
  }

  return Math.min(unitPriceCents, MAX_UNIT_PRICE_CENTS);
}

function normalizeOverrideReason(value: string | null): string | null {
  const normalized = value?.trim();

  return normalized || null;
}

function normalizeCartItems(items: PdvCartItem[]): PdvCartItem[] {
  const groupedItems = new Map<string, PdvCartItem>();

  for (const item of items) {
    const productId = item.productId.trim();
    const quantity = normalizeQuantity(item.quantity);
    const unitPriceCents = normalizeUnitPrice(item.unitPriceCents);

    if (!productId || quantity <= 0 || unitPriceCents <= 0) {
      continue;
    }

    const currentItem = groupedItems.get(productId);

    if (!currentItem) {
      groupedItems.set(productId, {
        productId,
        quantity,
        unitPriceCents,
        overrideReason: normalizeOverrideReason(item.overrideReason),
      });
      continue;
    }

    groupedItems.set(productId, {
      productId,
      quantity: Math.min(currentItem.quantity + quantity, MAX_ITEM_QUANTITY),
      unitPriceCents,
      overrideReason: normalizeOverrideReason(item.overrideReason),
    });
  }

  return Array.from(groupedItems.values());
}

function serializeCartItems(items: PdvCartItem[]): string {
  const payload: PdvCartCookiePayload = normalizeCartItems(items).map(
    (item) => [
      item.productId,
      item.quantity,
      item.unitPriceCents,
      item.overrideReason,
    ],
  );

  return encodeURIComponent(JSON.stringify(payload));
}

function deserializeCartItems(value: string | undefined): PdvCartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(decodeURIComponent(value));

    if (!isPdvCartCookiePayload(parsedValue)) {
      return [];
    }

    return normalizeCartItems(
      parsedValue.map(
        ([productId, quantity, unitPriceCents, overrideReason]) => ({
          productId,
          quantity,
          unitPriceCents,
          overrideReason,
        }),
      ),
    );
  } catch {
    return [];
  }
}

export async function getPdvCartItems(): Promise<PdvCartItem[]> {
  const cookieStore = await cookies();
  const cartCookie = cookieStore.get(PDV_CART_COOKIE_NAME);

  return deserializeCartItems(cartCookie?.value);
}

export async function savePdvCartItems(items: PdvCartItem[]): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(PDV_CART_COOKIE_NAME, serializeCartItems(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin/pdv",
  });
}

export async function addPdvCartItem(input: PdvCartItem): Promise<void> {
  const currentItems = await getPdvCartItems();

  await savePdvCartItems([...currentItems, input]);
}

export async function updatePdvCartItem(input: PdvCartItem): Promise<void> {
  const currentItems = await getPdvCartItems();
  const quantity = normalizeQuantity(input.quantity);
  const unitPriceCents = normalizeUnitPrice(input.unitPriceCents);

  if (quantity <= 0 || unitPriceCents <= 0) {
    await removePdvCartItem(input.productId);
    return;
  }

  const nextItems = currentItems.filter(
    (item) => item.productId !== input.productId,
  );

  await savePdvCartItems([
    ...nextItems,
    {
      productId: input.productId,
      quantity,
      unitPriceCents,
      overrideReason: normalizeOverrideReason(input.overrideReason),
    },
  ]);
}

export async function removePdvCartItem(productId: string): Promise<void> {
  const currentItems = await getPdvCartItems();

  await savePdvCartItems(
    currentItems.filter((item) => item.productId !== productId),
  );
}

export async function clearPdvCart(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(PDV_CART_COOKIE_NAME);
}
