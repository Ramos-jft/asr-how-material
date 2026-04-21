"use server";

import { ProductStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  addCartItem,
  clearCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/cart";
import { prisma } from "@/lib/prisma";

const cartActionSchema = z.object({
  productId: z.string().min(1, "Produto inválido."),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

export async function addToCartAction(formData: FormData) {
  const parsed = cartActionSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? "1",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Item inválido.");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: parsed.data.productId,
      isActive: true,
      status: {
        not: ProductStatus.INACTIVE,
      },
    },
    select: {
      id: true,
      stockCurrent: true,
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado ou inativo.");
  }

  if (product.stockCurrent <= 0) {
    throw new Error("Produto esgotado.");
  }

  await addCartItem({
    productId: product.id,
    quantity: Math.min(parsed.data.quantity, product.stockCurrent),
  });

  revalidatePath("/carrinho");
  redirect("/carrinho");
}

export async function updateCartItemAction(formData: FormData) {
  const parsed = cartActionSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? "1",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Item inválido.");
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { stockCurrent: true },
  });

  await updateCartItem({
    productId: parsed.data.productId,
    quantity: Math.min(
      parsed.data.quantity,
      product?.stockCurrent ?? parsed.data.quantity,
    ),
  });

  revalidatePath("/carrinho");
}

export async function removeCartItemAction(formData: FormData) {
  const productId = formData.get("productId");

  if (typeof productId !== "string" || !productId) {
    throw new Error("Produto inválido.");
  }

  await removeCartItem(productId);
  revalidatePath("/carrinho");
}

export async function clearCartAction() {
  await clearCart();
  revalidatePath("/carrinho");
}
