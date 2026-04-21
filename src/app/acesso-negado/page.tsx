import Link from "next/link";

export const metadata = {
  title: "Acesso negado | Material ASR HOW Brasil",
  description: "Você não possui permissão para acessar este recurso.",
};

export default function AccessDeniedPage() {
  return (
    <main className="page-shell">
      <section className="panel mx-auto max-w-2xl space-y-4 text-center">
        <span className="badge-brand mx-auto">RBAC</span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Você não tem permissão para acessar esta área
        </h1>
        <p className="text-base leading-7 text-slate-600">
          O controle de acesso por perfil já está ativo. Faça login com um usuário
          autorizado ou retorne para a página inicial.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/" className="button-secondary">
            Voltar ao início
          </Link>
          <Link href="/login" className="button-primary">
            Ir para login
          </Link>
        </div>
      </section>
    </main>
  );
}
