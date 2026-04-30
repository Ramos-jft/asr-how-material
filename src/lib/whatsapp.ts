export function onlyDigits(value: string): string {
  return value.replaceAll(/\D/g, "");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = onlyDigits(phone);

  if (!normalizedPhone) {
    throw new Error("Telefone de WhatsApp não informado.");
  }

  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}
