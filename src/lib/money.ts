export function parseCurrencyToCents(
  value: FormDataEntryValue | null,
): number | null {
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .replaceAll(/\s/g, "")
    .replaceAll(/R\$/gi, "")
    .replaceAll('.', "")
    .replace(",", ".");

  if (!normalized) return null;

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
}

export function centsToCurrencyInput(valueInCents: number): string {
  return (valueInCents / 100).toFixed(2).replace(".", ",");
}

export function parsePositiveInteger(
  value: FormDataEntryValue | null,
): number | null {
  if (typeof value !== "string") return null;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) return null;

  return parsed;
}
