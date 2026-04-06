import "dotenv/config";
import { defineConfig, env } from "prisma/config";

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Opcional, só se você realmente precisar de shadow DB separado:
    // shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});