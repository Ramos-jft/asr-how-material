"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { uploadProductImageToR2 } from "@/lib/storage/r2";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

const uploadProductImageSchema = z.object({
  productId: z.string().min(1, "Produto inválido."),
});

function redirectToProductsMessage(input: {
  type: "sucesso" | "erro";
  message: string;
}): never {
  const params = new URLSearchParams({
    [input.type]: input.message,
  });

  redirect(`/admin/produtos?${params.toString()}`);
}

function getImageFile(formData: FormData): File {
  const file = formData.get("image");

  if (!(file instanceof File)) {
    throw new TypeError("Selecione uma imagem.");
  }

  return file;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Não foi possível enviar a imagem do produto.";
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.PRODUCTS_IMAGES_UPLOAD);

  const parsed = uploadProductImageSchema.safeParse({
    productId: formData.get("productId"),
  });

  if (!parsed.success) {
    redirectToProductsMessage({
      type: "erro",
      message: parsed.error.issues[0]?.message ?? "Produto inválido.",
    });
  }

  try {
    const imageFile = getImageFile(formData);

    const product = await prisma.product.findUnique({
      where: {
        id: parsed.data.productId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    const uploadedImage = await uploadProductImageToR2({
      productId: product.id,
      file: imageFile,
    });

    const lastImage = await prisma.productImage.aggregate({
      where: {
        productId: product.id,
      },
      _max: {
        sortOrder: true,
      },
    });

    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: uploadedImage.url,
        alt: product.name,
        sortOrder: (lastImage._max.sortOrder ?? -1) + 1,
      },
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/catalogo");
    revalidatePath(`/produto/${product.slug}`);

    redirectToProductsMessage({
      type: "sucesso",
      message: "Imagem enviada com sucesso.",
    });
  } catch (error) {
    redirectToProductsMessage({
      type: "erro",
      message: getErrorMessage(error),
    });
  }
}
