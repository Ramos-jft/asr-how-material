import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Material ASR HOW Brasil",
    template: "%s | Material ASR HOW Brasil",
  },
  description:
    "Loja restrita, painel administrativo e PDV da Material ASR HOW Brasil.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
