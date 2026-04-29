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

function redirectToCartMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/carrinho?${params.toString()}`);
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
      name: true,
      stockCurrent: true,
    },
  });
}

export async function addToCartAction(formData: FormData): Promise<void> {
  const productId = getStringField(formData, "productId");

  if (!productId) {
    redirectToCartMessage({
      type: "erro",
      message: "Produto inválido. Volte ao catálogo e tente novamente.",
    });
  }

  const product = await findAvailableProduct(productId);

  if (!product) {
    redirectToCartMessage({
      type: "erro",
      message:
        "Este produto está indisponível ou sem estoque no momento. Escolha outro item no catálogo.",
    });
  }

  const requestedQuantity = getQuantityField(formData);
  const quantity = Math.min(requestedQuantity, product.stockCurrent);

  await addCartItem({
    productId: product.id,
    quantity,
  });

  revalidatePath("/carrinho");
  revalidatePath("/catalogo");

  if (quantity < requestedQuantity) {
    redirectToCartMessage({
      type: "sucesso",
      message: `Produto adicionado, mas a quantidade foi limitada ao estoque disponível: ${quantity}.`,
    });
  }

  redirectToCartMessage({
    type: "sucesso",
    message: "Produto adicionado ao carrinho.",
  });
}

export async function updateCartItemAction(formData: FormData): Promise<void> {
  const productId = getStringField(formData, "productId");

  if (!productId) {
    redirectToCartMessage({
      type: "erro",
      message: "Item inválido. Atualize a página e tente novamente.",
    });
  }

  const product = await findAvailableProduct(productId);

  if (!product) {
    await removeCartItem(productId);
    revalidatePath("/carrinho");

    redirectToCartMessage({
      type: "erro",
      message:
        "O produto ficou indisponível e foi removido do carrinho automaticamente.",
    });
  }

  const requestedQuantity = getQuantityField(formData);
  const quantity = Math.min(requestedQuantity, product.stockCurrent);

  await updateCartItem({
    productId: product.id,
    quantity,
  });

  revalidatePath("/carrinho");

  if (quantity < requestedQuantity) {
    redirectToCartMessage({
      type: "sucesso",
      message: `Quantidade atualizada e limitada ao estoque disponível: ${quantity}.`,
    });
  }

  redirectToCartMessage({
    type: "sucesso",
    message: "Quantidade atualizada com sucesso.",
  });
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const productId = getStringField(formData, "productId");

  if (!productId) {
    redirectToCartMessage({
      type: "erro",
      message: "Item inválido. Atualize a página e tente novamente.",
    });
  }

  await removeCartItem(productId);

  revalidatePath("/carrinho");

  redirectToCartMessage({
    type: "sucesso",
    message: "Produto removido do carrinho.",
  });
}

export async function clearCartAction(): Promise<void> {
  await clearCart();

  revalidatePath("/carrinho");

  redirectToCartMessage({
    type: "sucesso",
    message: "Carrinho limpo com sucesso.",
  });
}
