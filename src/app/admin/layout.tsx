import Link from "next/link";

import { logoutAction } from "@/app/actions/logout";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await requirePermission(PERMISSIONS.DASHBOARD_READ);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              Material ASR HOW Brasil
            </p>
            <h1 className="text-lg font-semibold text-slate-950">Painel administrativo</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="button-secondary">
              Ver início
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="button-primary">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="panel panel-tight space-y-2">
          <p className="text-sm font-medium text-slate-500">Usuário atual</p>
          <h2 className="text-lg font-semibold text-slate-950">{auth.user.name}</h2>
          <p className="text-sm text-slate-600">{auth.user.email}</p>
          <div className="flex flex-wrap gap-2 pt-3">
            {auth.roles.map((role) => (
              <span key={role} className="badge-muted">
                {role}
              </span>
            ))}
          </div>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}
