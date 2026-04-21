"use client";

import { useActionState } from "react";

import { loginAction, type LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="panel panel-tight space-y-5">
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
          placeholder="admin@materialasr.local"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="field-label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="field-input"
          placeholder="••••••••"
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="button-primary w-full" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}
