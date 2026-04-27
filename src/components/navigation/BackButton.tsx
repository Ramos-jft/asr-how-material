"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = Readonly<{
  label?: string;
}>;

export function BackButton({ label = "Voltar" }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-800 hover:text-blue-800"
    >
      {label}
    </button>
  );
}
