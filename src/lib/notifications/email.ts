import { Resend } from "resend";
import { env } from "@/lib/env";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendTransactionalEmail(input: SendEmailInput) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn(
      "Envio de e-mail ignorado: RESEND_API_KEY/EMAIL_FROM ausente.",
    );
    return { skipped: true };
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  return {
    skipped: false,
    result,
  };
}
