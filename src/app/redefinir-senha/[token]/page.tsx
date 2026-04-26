import type { Metadata } from "next";
import Link from "next/link";

import { resetPasswordAction } from "@/app/redefinir-senha/actions";
import {
  isPasswordResetTokenValidForUser,
  verifyPasswordResetToken,
} from "@/lib/auth/password-reset";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redefinir senha | Material ASR HOW Brasil",
  description: "Crie uma nova senha para acessar sua conta de comprador.",
};

type RedefinirSenhaPageProps = Readonly<{
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<{
    erro?: string;
  }>;
}>;

async function isTokenUsable(token: string): Promise<boolean> {
  const verifiedToken = await verifyPasswordResetToken(token);

  if (!verifiedToken) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: verifiedToken.userId,
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return false;
  }

  return isPasswordResetTokenValidForUser(verifiedToken, user);
}

export default async function RedefinirSenhaPage({
  params,
  searchParams,
}: RedefinirSenhaPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const isValidToken = await isTokenUsable(token);

  return (
    <main className="page-shell">
      <section className="mx-auto w-full max-w-xl">
        {isValidToken ? (
          <form action={resetPasswordAction} className="panel space-y-5">
            <div className="space-y-2">
              <span className="badge-brand">Nova senha</span>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Crie uma nova senha
              </h1>

              <p className="text-sm leading-6 text-slate-600">
                Informe e confirme sua nova senha para recuperar o acesso de
                comprador.
              </p>
            </div>

            {query?.erro ? (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {query.erro}
              </p>
            ) : null}

            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
              <label className="field-label" htmlFor="password">
                Nova senha
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="field-input"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="passwordConfirmation">
                Confirmar nova senha
              </label>

              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                className="field-input"
                required
              />
            </div>

            <button type="submit" className="button-primary w-full">
              Alterar senha
            </button>
          </form>
        ) : (
          <div className="panel space-y-5">
            <span className="badge-brand">Link inválido</span>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Link inválido ou expirado
            </h1>

            <p className="text-sm leading-6 text-slate-600">
              Solicite um novo link de recuperação de senha para continuar.
            </p>

            <Link
              className="button-primary flex w-full"
              href="/recuperar-senha"
            >
              Solicitar novo link
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
