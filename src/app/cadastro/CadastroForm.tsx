"use client";

import { useActionState } from "react";

import {
  createCustomerRegistrationAction,
  type CadastroFormState,
} from "@/app/cadastro/actions";

const initialState: CadastroFormState = {};

type FieldErrorProps = {
  message?: string;
};

function FieldError({ message }: Readonly<FieldErrorProps>) {
  if (!message) return null;

  return <p className="text-sm text-red-700">{message}</p>;
}

export function CadastroForm() {
  const [state, formAction, isPending] = useActionState(
    createCustomerRegistrationAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="panel panel-tight space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message}
        </div>

        <a className="button-primary w-full" href="/catalogo">
          Ver catálogo
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="panel panel-tight space-y-6">
      {state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Dados do responsável
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Informe os dados usados para aprovação do cadastro.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="field-label" htmlFor="name">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              className="field-input"
              autoComplete="name"
              required
            />
            <FieldError message={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="csaName">
              Nome CSA
            </label>
            <input id="csaName" name="csaName" className="field-input" />
            <FieldError message={state.fieldErrors?.csaName} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="charge">
              Encargo
            </label>
            <input id="charge" name="charge" className="field-input" />
            <FieldError message={state.fieldErrors?.charge} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="phone">
              Telefone / WhatsApp
            </label>
            <input
              id="phone"
              name="phone"
              className="field-input"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(19) 99999-9999"
              required
            />
            <FieldError message={state.fieldErrors?.phone} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="field-input"
              autoComplete="email"
              required
            />
            <FieldError message={state.fieldErrors?.email} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="field-label" htmlFor="groupCode">
              Grupo / unidade / identificador interno
            </label>
            <input
              id="groupCode"
              name="groupCode"
              className="field-input"
              required
            />
            <FieldError message={state.fieldErrors?.groupCode} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Endereço de entrega
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            O endereço será usado no checkout e na separação do pedido.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="field-label" htmlFor="zipCode">
              CEP
            </label>
            <input
              id="zipCode"
              name="zipCode"
              className="field-input"
              inputMode="numeric"
              autoComplete="postal-code"
              required
            />
            <FieldError message={state.fieldErrors?.zipCode} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="state">
              UF
            </label>
            <input
              id="state"
              name="state"
              className="field-input"
              maxLength={2}
              placeholder="SP"
              required
            />
            <FieldError message={state.fieldErrors?.state} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="city">
              Cidade
            </label>
            <input id="city" name="city" className="field-input" required />
            <FieldError message={state.fieldErrors?.city} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="district">
              Bairro
            </label>
            <input
              id="district"
              name="district"
              className="field-input"
              required
            />
            <FieldError message={state.fieldErrors?.district} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="field-label" htmlFor="street">
              Endereço
            </label>
            <input
              id="street"
              name="street"
              className="field-input"
              autoComplete="street-address"
              required
            />
            <FieldError message={state.fieldErrors?.street} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="number">
              Número
            </label>
            <input id="number" name="number" className="field-input" required />
            <FieldError message={state.fieldErrors?.number} />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="complement">
              Complemento
            </label>
            <input id="complement" name="complement" className="field-input" />
            <FieldError message={state.fieldErrors?.complement} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="field-label" htmlFor="reference">
              Referência
            </label>
            <input id="reference" name="reference" className="field-input" />
            <FieldError message={state.fieldErrors?.reference} />
          </div>
        </div>
      </section>

      <button
        type="submit"
        className="button-primary w-full"
        disabled={isPending}
      >
        {isPending ? "Enviando cadastro..." : "Enviar cadastro para aprovação"}
      </button>
    </form>
  );
}
