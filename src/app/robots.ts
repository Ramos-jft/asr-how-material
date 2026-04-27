import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  const baseUrl = process.env.APP_BASE_URL;

  if (!baseUrl) {
    return "http://localhost:3000";
  }

  return baseUrl.replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/catalogo",
          "/produto",
          "/cadastro",
          "/login/admin",
          "/login/comprador",
          "/recuperar-senha",
        ],
        disallow: [
          "/admin",
          "/checkout",
          "/carrinho",
          "/pedidos",
          "/minha-conta",
          "/pagamento",
          "/redefinir-senha",
          "/api",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
