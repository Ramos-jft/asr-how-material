import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  updateCustomerPasswordAction,
  updateCustomerProfileAction,
} from "@/app/minha-conta/actions";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minha conta",
  description:
    "Atualize seus dados cadastrais, endereço, e-mail e senha de acesso.",
};

type MinhaContaPageProps = Readonly<{
  searchParams?: Promise<{
    sucesso?: string;
    erro?: string;
  }>;
}>;

function AlertMessage({
  type,
  message,
}: Readonly<{
  type: "success" | "error";
  message?: string;
}>) {
  if (!message) return null;

  const className =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border px-4 py-3 text-sm ${className}`}
    >
      {message}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default async function MinhaContaPage({
  searchParams,
}: MinhaContaPageProps) {
  const [{ user }, params] = await Promise.all([requireAuth(), searchParams]);

  const customer = await prisma.customer.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      address: true,
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <main className="page-shell items-start">
      <section className="panel w-full space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="badge-brand">Minha conta</span>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Atualize seus dados
            </h1>

            <p className="max-w-3xl text-base leading-7 text-slate-600">
              Mantenha seu cadastro, endereço de entrega, e-mail e senha sempre
              atualizados para evitar problemas no checkout e na comunicação do
              pedido.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="button-secondary" href="/pedidos">
              Meus pedidos
            </Link>

            <Link className="button-secondary" href="/catalogo">
              Ver catálogo
            </Link>
          </div>
        </header>

        <div className="space-y-3">
          <AlertMessage type="success" message={params?.sucesso} />
          <AlertMessage type="error" message={params?.erro} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form
            action={updateCustomerProfileAction}
            className="space-y-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <SectionHeader
              title="Dados cadastrais"
              description="Essas informações serão usadas para contato, aprovação e identificação do comprador."
            />

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
                  defaultValue={customer.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="csaName">
                  Nome CSA
                </label>
                <input
                  id="csaName"
                  name="csaName"
                  className="field-input"
                  defaultValue={customer.csaName ?? ""}
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="charge">
                  Encargo
                </label>
                <input
                  id="charge"
                  name="charge"
                  className="field-input"
                  defaultValue={customer.charge ?? ""}
                />
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
                  defaultValue={customer.phone}
                  required
                />
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
                  defaultValue={customer.email}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="field-label" htmlFor="groupCode">
                  Grupo / unidade / identificador interno
                </label>
                <input
                  id="groupCode"
                  name="groupCode"
                  className="field-input"
                  defaultValue={customer.groupCode}
                  required
                />
              </div>
            </div>

            <SectionHeader
              title="Endereço de entrega"
              description="O endereço será usado no checkout, separação e envio do pedido."
            />

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
                  defaultValue={customer.address?.zipCode ?? ""}
                  required
                />
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
                  defaultValue={customer.address?.state ?? ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="city">
                  Cidade
                </label>
                <input
                  id="city"
                  name="city"
                  className="field-input"
                  defaultValue={customer.address?.city ?? ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="district">
                  Bairro
                </label>
                <input
                  id="district"
                  name="district"
                  className="field-input"
                  defaultValue={customer.address?.district ?? ""}
                  required
                />
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
                  defaultValue={customer.address?.street ?? ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="number">
                  Número
                </label>
                <input
                  id="number"
                  name="number"
                  className="field-input"
                  defaultValue={customer.address?.number ?? ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="complement">
                  Complemento
                </label>
                <input
                  id="complement"
                  name="complement"
                  className="field-input"
                  defaultValue={customer.address?.complement ?? ""}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="field-label" htmlFor="reference">
                  Referência
                </label>
                <input
                  id="reference"
                  name="reference"
                  className="field-input"
                  defaultValue={customer.address?.reference ?? ""}
                />
              </div>
            </div>

            <button type="submit" className="button-primary w-full">
              Salvar alterações do cadastro
            </button>
          </form>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-950">
                Status do cadastro
              </h2>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Status</dt>
                  <dd className="font-semibold text-slate-950">
                    {customer.status}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Compras temporárias</dt>
                  <dd className="font-semibold text-slate-950">
                    {customer.temporaryPurchaseRemaining}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">E-mail de login</dt>
                  <dd className="break-all text-right font-semibold text-slate-950">
                    {customer.email}
                  </dd>
                </div>
              </dl>
            </section>

            <form
              action={updateCustomerPasswordAction}
              className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <SectionHeader
                title="Alterar senha"
                description="Para sua segurança, informe a senha atual antes de criar uma nova senha."
              />

              <div className="space-y-2">
                <label className="field-label" htmlFor="currentPassword">
                  Senha atual
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  className="field-input"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="newPassword">
                  Nova senha
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  className="field-input"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="field-label"
                  htmlFor="newPasswordConfirmation"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="newPasswordConfirmation"
                  name="newPasswordConfirmation"
                  type="password"
                  className="field-input"
                  autoComplete="new-password"
                  required
                />
              </div>

              <button type="submit" className="button-primary w-full">
                Alterar senha
              </button>
            </form>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              O administrador não visualiza sua senha. Por segurança, o sistema
              armazena apenas o hash criptográfico da senha.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
