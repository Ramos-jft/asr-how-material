import type { NextConfig } from "next";

function getR2RemotePattern():
  | NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number]
  | null {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL(baseUrl);

    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const r2RemotePattern = getR2RemotePattern();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: r2RemotePattern ? [r2RemotePattern] : [],
  },
};

export default nextConfig;
