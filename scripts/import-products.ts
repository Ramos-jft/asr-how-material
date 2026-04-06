import path from "node:path";
import xlsx from "xlsx";
import slugify from "slugify";
import { PrismaClient, ProductStatus } from "@prisma/client";
import { env } from "../src/lib/env";

type SpreadsheetRow = {
  "Código de Barras"?: string;
  "Tipo de Produto"?: string;
  "Descrição"?: string;
  "Preço de Custo"?: number;
  "Preço Venda Varejo"?: number;
  "Preço Venda Atacado"?: number;
  "Quantidade Mínima Atacado"?: number;
  "Unidade"?: string;
  "Ativo"?: string;
  "Categoria do Produto"?: string;
  "Subcategoria do Produto"?: string;
  "Quantidade em Estoque"?: number;
  "Estoque mínimo"?: number;
  "Marca"?: string;
  "Modelo"?: string;
  "Código Interno"?: string;
  "Nome na Loja Virtual"?: string;
  "Preço Por"?: number;
  "Descrição do Produto"?: string;
};

const prisma = new PrismaClient();

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toCents(value: number | null): number {
  if (!value || value <= 0) return 0;
  return Math.round(value * 100);
}

function makeSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, locale: "pt" });
}

async function ensureCategory(
  name: string,
  parentId?: string,
  parentSlug?: string,
): Promise<{ id: string; slug: string }> {
  const slugBase = parentSlug ? `${parentSlug}-${name}` : name;
  const slug = makeSlug(slugBase);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return { id: existing.id, slug: existing.slug };

  const created = await prisma.category.create({
    data: {
      name,
      slug,
      parentId,
    },
  });

  return { id: created.id, slug: created.slug };
}

async function main() {
  const filePath = path.resolve(env.PRODUCTS_IMPORT_PATH);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Nenhuma aba encontrada na planilha.");
  }

  const rows = xlsx.utils.sheet_to_json<SpreadsheetRow>(
    workbook.Sheets[sheetName],
    {
      defval: null,
    },
  );

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const sku =
      normalizeString(row["Código Interno"]) ??
      normalizeString(row["Código de Barras"]);

    const barcode = normalizeString(row["Código de Barras"]);
    const name =
      normalizeString(row["Nome na Loja Virtual"]) ??
      normalizeString(row["Descrição"]);

    if (!sku || !name) {
      skipped++;
      continue;
    }

    const retailPrice =
      (normalizeNumber(row["Preço Por"]) ?? 0) > 0
        ? normalizeNumber(row["Preço Por"])
        : normalizeNumber(row["Preço Venda Varejo"]);

    const wholesalePrice = normalizeNumber(row["Preço Venda Atacado"]);
    const stockCurrent = normalizeNumber(row["Quantidade em Estoque"]) ?? 0;
    const stockMin = normalizeNumber(row["Estoque mínimo"]) ?? 0;
    const minWholesaleQty =
      normalizeNumber(row["Quantidade Mínima Atacado"]) ?? null;

    const retailPriceCents = toCents(retailPrice);
    const wholesalePriceCents =
      wholesalePrice && wholesalePrice > 0 ? toCents(wholesalePrice) : null;

    if (retailPriceCents <= 0) {
      console.warn(`Produto ignorado por preço inválido: ${sku} - ${name}`);
      skipped++;
      continue;
    }

    const categoryName = normalizeString(row["Categoria do Produto"]);
    const subcategoryName = normalizeString(row["Subcategoria do Produto"]);

    let categoryId: string | null = null;
    let subcategoryId: string | null = null;
    let categorySlug: string | null = null;

    if (categoryName) {
      const category = await ensureCategory(categoryName);
      categoryId = category.id;
      categorySlug = category.slug;
    }

    if (subcategoryName && categoryId && categorySlug) {
      const subcategory = await ensureCategory(
        subcategoryName,
        categoryId,
        categorySlug,
      );
      subcategoryId = subcategory.id;
    }

    const isActive = normalizeString(row["Ativo"]) === "Sim";

    const status = !isActive
      ? ProductStatus.INACTIVE
      : stockCurrent <= 0
        ? ProductStatus.OUT_OF_STOCK
        : ProductStatus.ACTIVE;

    await prisma.product.upsert({
      where: { sku },
      update: {
        barcode,
        externalId: normalizeString(row["Código Interno"]),
        name,
        slug: `${makeSlug(name)}-${makeSlug(sku)}`,
        shortDescription: normalizeString(row["Descrição"]),
        fullDescription:
          normalizeString(row["Descrição do Produto"]) ??
          normalizeString(row["Descrição"]),
        unit: normalizeString(row["Unidade"]),
        typeLabel: normalizeString(row["Tipo de Produto"]),
        brand: normalizeString(row["Marca"]),
        model: normalizeString(row["Modelo"]),
        retailPriceCents,
        wholesalePriceCents,
        minWholesaleQty,
        isActive,
        status,
        stockCurrent,
        stockMin,
        categoryId,
        subcategoryId,
      },
      create: {
        sku,
        barcode,
        externalId: normalizeString(row["Código Interno"]),
        name,
        slug: `${makeSlug(name)}-${makeSlug(sku)}`,
        shortDescription: normalizeString(row["Descrição"]),
        fullDescription:
          normalizeString(row["Descrição do Produto"]) ??
          normalizeString(row["Descrição"]),
        unit: normalizeString(row["Unidade"]),
        typeLabel: normalizeString(row["Tipo de Produto"]),
        brand: normalizeString(row["Marca"]),
        model: normalizeString(row["Modelo"]),
        retailPriceCents,
        wholesalePriceCents,
        minWholesaleQty,
        isActive,
        status,
        stockCurrent,
        stockMin,
        categoryId,
        subcategoryId,
      },
    });

    imported++;
  }

  console.log({
    imported,
    skipped,
    filePath,
  });
}

main()
  .catch((error) => {
    console.error("Falha na importação:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });