import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Escolha seu acesso | Material ASR HOW Brasil",
  description: "Escolha entre acesso de comprador ou acesso administrativo.",
};

export default function LoginPage() {
  redirect("/");
}
