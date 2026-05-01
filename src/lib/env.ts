import { z } from "zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isLocalPublicPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function isValidUrlOrLocalPublicPath(value: string): boolean {
  return isValidUrl(value) || isLocalPublicPath(value);
}

function optionalEnv<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return z.preprocess(emptyStringToUndefined, schema.optional());
}

const requiredUrl = z
  .string()
  .trim()
  .min(1, "URL obrigatória.")
  .refine(isValidUrl, "Informe uma URL válida.");

const optionalUrl = z
  .string()
  .trim()
  .min(1, "URL obrigatória.")
  .refine(isValidUrl, "Informe uma URL válida.");

const optionalUrlOrLocalPublicPath = z
  .string()
  .trim()
  .min(1, "URL ou caminho local obrigatório.")
  .refine(
    isValidUrlOrLocalPublicPath,
    "Informe uma URL válida ou um caminho local iniciado com /.",
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_BASE_URL: requiredUrl,

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  NEXT_PUBLIC_STORE_NAME: z.string().min(1),
  NEXT_PUBLIC_WHATSAPP_PHONE: z.string().min(10),

  PRODUCTS_IMPORT_PATH: z.string().min(1),

  PIX_KEY: optionalEnv(z.string().min(1)),
  PIX_QR_CODE_URL: optionalEnv(optionalUrlOrLocalPublicPath),

  R2_ACCOUNT_ID: optionalEnv(z.string().min(1)),
  R2_ACCESS_KEY_ID: optionalEnv(z.string().min(1)),
  R2_SECRET_ACCESS_KEY: optionalEnv(z.string().min(1)),
  R2_BUCKET: optionalEnv(z.string().min(1)),
  R2_REGION: optionalEnv(z.string().min(1)),
  R2_ENDPOINT: optionalEnv(optionalUrl),
  R2_PUBLIC_BASE_URL: optionalEnv(optionalUrl),

  RESEND_API_KEY: optionalEnv(z.string().min(1)),
  EMAIL_FROM: optionalEnv(z.string().min(1)),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,

  APP_BASE_URL: process.env.APP_BASE_URL,

  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,

  JWT_SECRET: process.env.JWT_SECRET,

  NEXT_PUBLIC_STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME,
  NEXT_PUBLIC_WHATSAPP_PHONE: process.env.NEXT_PUBLIC_WHATSAPP_PHONE,

  PRODUCTS_IMPORT_PATH: process.env.PRODUCTS_IMPORT_PATH,

  PIX_KEY: process.env.PIX_KEY,
  PIX_QR_CODE_URL: process.env.PIX_QR_CODE_URL,

  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_REGION: process.env.R2_REGION,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
});

export type Env = z.infer<typeof envSchema>;
