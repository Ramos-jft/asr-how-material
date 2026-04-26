import { cookies } from "next/headers";

const CART_COOKIE_NAME = "asr_cart";
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const MAX_ITEM_QUANTITY = 999;

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartCookiePayload = [string, number][];

function isCartCookiePayload(value: unknown): value is CartCookiePayload {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        Array.isArray(item) &&
        item.length === 2 &&
        typeof item[0] === "string" &&
        Number.isInteger(item[1]),
    )
  );
}

function normalizeQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return 0;
  }

  return Math.min(quantity, MAX_ITEM_QUANTITY);
}

function normalizeCartItems(items: CartItem[]): CartItem[] {
  const groupedItems = new Map<string, number>();

  for (const item of items) {
    const productId = item.productId.trim();
    const quantity = normalizeQuantity(item.quantity);

    if (!productId || quantity <= 0) {
      continue;
    }

    const currentQuantity = groupedItems.get(productId) ?? 0;
    groupedItems.set(
      productId,
      Math.min(currentQuantity + quantity, MAX_ITEM_QUANTITY),
    );
  }

  return Array.from(groupedItems.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function serializeCartItems(items: CartItem[]): string {
  const payload: CartCookiePayload = normalizeCartItems(items).map((item) => [
    item.productId,
    item.quantity,
  ]);

  return encodeURIComponent(JSON.stringify(payload));
}

function deserializeCartItems(value: string | undefined): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(decodeURIComponent(value));

    if (!isCartCookiePayload(parsedValue)) {
      return [];
    }

    return normalizeCartItems(
      parsedValue.map(([productId, quantity]) => ({
        productId,
        quantity,
      })),
    );
  } catch {
    return [];
  }
}

export async function getCartItems(): Promise<CartItem[]> {
  const cookieStore = await cookies();
  const cartCookie = cookieStore.get(CART_COOKIE_NAME);

  return deserializeCartItems(cartCookie?.value);
}

export async function saveCartItems(items: CartItem[]): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(CART_COOKIE_NAME, serializeCartItems(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function addCartItem(input: CartItem): Promise<void> {
  const currentItems = await getCartItems();

  await saveCartItems([...currentItems, input]);
}

export async function updateCartItem(input: CartItem): Promise<void> {
  const currentItems = await getCartItems();
  const quantity = normalizeQuantity(input.quantity);

  if (quantity <= 0) {
    await removeCartItem(input.productId);
    return;
  }

  const nextItems = currentItems.filter(
    (item) => item.productId !== input.productId,
  );

  await saveCartItems([
    ...nextItems,
    {
      productId: input.productId,
      quantity,
    },
  ]);
}

export async function removeCartItem(productId: string): Promise<void> {
  const currentItems = await getCartItems();

  await saveCartItems(
    currentItems.filter((item) => item.productId !== productId),
  );
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(CART_COOKIE_NAME);
}