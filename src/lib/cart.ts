import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";

const CART_COOKIE_NAME = "asr_cart";
const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
});

const cartSchema = z.array(cartItemSchema).max(200);

export type CartItem = z.infer<typeof cartItemSchema>;

function normalizeQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) return 1;
  return Math.min(quantity, 999);
}

export async function getCartItems(): Promise<CartItem[]> {
  const cookieStore = await cookies();
  const rawCart = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (!rawCart) return [];

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCart));
    const result = cartSchema.safeParse(parsed);

    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export async function setCartItems(items: CartItem[]): Promise<void> {
  const normalizedItems = items
    .filter((item) => item.productId.trim().length > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: normalizeQuantity(item.quantity),
    }));

  const cookieStore = await cookies();

  if (normalizedItems.length === 0) {
    cookieStore.delete(CART_COOKIE_NAME);
    return;
  }

  cookieStore.set(
    CART_COOKIE_NAME,
    encodeURIComponent(JSON.stringify(normalizedItems)),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CART_MAX_AGE_SECONDS,
    },
  );
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE_NAME);
}

export async function addCartItem(input: CartItem): Promise<void> {
  const items = await getCartItems();
  const existingItem = items.find((item) => item.productId === input.productId);

  if (existingItem) {
    existingItem.quantity = normalizeQuantity(
      existingItem.quantity + input.quantity,
    );
    await setCartItems(items);
    return;
  }

  await setCartItems([
    ...items,
    {
      productId: input.productId,
      quantity: normalizeQuantity(input.quantity),
    },
  ]);
}

export async function updateCartItem(input: CartItem): Promise<void> {
  const items = await getCartItems();

  await setCartItems(
    items.map((item) =>
      item.productId === input.productId
        ? { ...item, quantity: normalizeQuantity(input.quantity) }
        : item,
    ),
  );
}

export async function removeCartItem(productId: string): Promise<void> {
  const items = await getCartItems();
  await setCartItems(items.filter((item) => item.productId !== productId));
}
