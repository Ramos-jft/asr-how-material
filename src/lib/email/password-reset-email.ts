import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";

type SendPasswordResetEmailResult = {
  sent: boolean;
  reason?: string;
};

function hasEmailProvider(): boolean {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<SendPasswordResetEmailResult> {
  if (!hasEmailProvider()) {
    return {
      sent: false,
      reason: "RESEND_API_KEY ou EMAIL_FROM não configurado.",
    };
  }

  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: env.EMAIL_FROM as string,
    to: input.to,
    subject: "Redefinição de senha - Material ASR HOW Brasil",
    text: [
      `Olá, ${input.name}.`,
      "",
      "Recebemos uma solicitação para redefinir sua senha.",
      "Use o link abaixo para criar uma nova senha:",
      "",
      input.resetUrl,
      "",
      "Este link expira em 30 minutos.",
      "Se você não solicitou essa alteração, ignore este e-mail.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 20px;">Redefinição de senha</h1>
        <p>Olá, ${input.name}.</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>
          <a href="${input.resetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 700;">
            Criar nova senha
          </a>
        </p>
        <p>Este link expira em 30 minutos.</p>
        <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
      </div>
    `,
  });

  return {
    sent: true,
  };
}
