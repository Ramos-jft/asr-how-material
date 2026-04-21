"use client";

import { useActionState } from "react";

import {
  registerCustomerAction,
  type CustomerRegistrationState,
} from "@/app/cadastro/actions";

const initialState: CustomerRegistrationState = {};

type FieldErrorProps = {
  message?: string;
};

function FieldError({ message }: Readonly<FieldErrorProps>) {
  if (!message) return null;

  return <p className="mt-1 text-sm text-red-700">{message}</p>;
}

export function CadastroForm() {
  const [state, formAction, isPending] = useActionState(
    registerCustomerAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-8">
      {state.success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {state.success}
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">
          Dados do responsável
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Nome completo
            </span>
            <input
              name="name"
              required
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.name?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nome CSA</span>
            <input
              name="csaName"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.csaName?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Encargo</span>
            <input
              name="charge"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.charge?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Grupo/unidade/identificador
            </span>
            <input
              name="groupCode"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.groupCode?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">WhatsApp</span>
            <input
              name="phone"
              required
              autoComplete="tel"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.phone?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.email?.[0]} />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">
          Endereço completo
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">CEP</span>
            <input
              name="zipCode"
              required
              autoComplete="postal-code"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.zipCode?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Estado</span>
            <input
              name="state"
              required
              maxLength={2}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 uppercase outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.state?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Cidade</span>
            <input
              name="city"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.city?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Bairro</span>
            <input
              name="district"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.district?.[0]} />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Rua / endereço
            </span>
            <input
              name="street"
              required
              autoComplete="street-address"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.street?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Número</span>
            <input
              name="number"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.number?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Complemento
            </span>
            <input
              name="complement"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.complement?.[0]} />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              Referência
            </span>
            <input
              name="reference"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            <FieldError message={state.fieldErrors?.reference?.[0]} />
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          O cadastro ficará pendente até aprovação manual da administração.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-blue-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Enviando..." : "Enviar cadastro"}
        </button>
      </div>
    </form>
  );
}
