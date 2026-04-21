export function formatCurrencyFromCents(valueInCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}
