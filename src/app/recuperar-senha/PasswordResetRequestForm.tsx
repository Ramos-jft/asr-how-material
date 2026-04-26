"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type RequestPasswordResetFormState,
} from "@/app/recuperar-senha/actions";

const initialState: RequestPasswordResetFormState = {};

export function PasswordResetRequestForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="panel panel-tight space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-950">
          Recuperar senha
        </h2>

        <p className="text-sm leading-6 text-slate-600">
          Informe o e-mail usado no cadastro de comprador. Se a conta existir e
          estiver ativa, enviaremos um link para criar uma nova senha.
        </p>
      </div>

      <div className="space-y-2">
        <label className="field-label" htmlFor="email">
          E-mail
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="field-input"
          placeholder="comprador@email.com"
          required
        />
      </div>

      {state.message ? (
        <div
          role="alert"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p>{state.message}</p>

          {state.devResetUrl ? (
            <Link
              className="mt-3 inline-flex font-semibold underline"
              href={state.devResetUrl}
            >
              Abrir link de redefinição em desenvolvimento
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        className="button-primary w-full"
        disabled={isPending}
      >
        {isPending ? "Enviando..." : "Enviar instruções"}
      </button>

      <Link className="button-secondary flex w-full" href="/login/comprador">
        Voltar ao login do comprador
      </Link>
    </form>
  );
}
