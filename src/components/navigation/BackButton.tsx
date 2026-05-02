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
      className="rounded-full border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-800 hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    >
      {label}
    </button>
  );
}
