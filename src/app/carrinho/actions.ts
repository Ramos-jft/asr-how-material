"use server";

import { ProductStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addCartItem,
  clearCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/cart";
import { prisma } from "@/lib/prisma";

function getStringField(formData: FormData, fieldName: string): string | null {
  const value = formData.get(fieldName);

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getQuantityField(formData: FormData): number {
  const value = formData.get("quantity");

  if (typeof value !== "string") {
    return 1;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
}

async function findAvailableProduct(productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      isActive: true,
      status: {
        not: ProductStatus.INACTIVE,
      },
      stockCurrent: {
        gt: 0,
      },
    },
    select: {
      id: true,
      stockCurrent: true,
    },
  });
}

export async function addToCartAction(formData: FormData): Promise<void> {
  const productId = getStringField(formData, "productId");

  if (!productId) {
    redirect("/catalogo");
  }

  const product = await findAvailableProduct(productId);

  if (!product) {
    redirect("/catalogo");
  }

  const requestedQuantity = getQuantityField(formData);
  const quantity = Math.min(requestedQuantity, product.stockCurrent);

  await addCartItem({
    productId: product.id,
    quantity,
  });

  revalidatePath("/carrinho");
  revalidatePath("/catalogo");

  redirect("/carrinho");
}

export async function updateCartItemAction(formData: FormData): Promise<void> {
  const productId = getStringField(formData, "productId");

  if (!productId) {
    redirect("/carrinho");
  }

  const product = await findAvailableProduct(productId);

  if (!product) {
    await removeCartItem(productId);
    revalidatePath("/carrinho");
    redirect("/carrinho");
  }

  const requestedQuantity = getQuantityField(formData);
  const quantity = Math.min(requestedQuantity, product.stockCurrent);

  await updateCartItem({
    productId: product.id,
    quantity,
  });

  revalidatePath("/carrinho");

  redirect("/carrinho");
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const productId = getStringField(formData, "productId");

  if (productId) {
    await removeCartItem(productId);
  }

  revalidatePath("/carrinho");

  redirect("/carrinho");
}

export async function clearCartAction(): Promise<void> {
  await clearCart();

  revalidatePath("/carrinho");

  redirect("/carrinho");
}
