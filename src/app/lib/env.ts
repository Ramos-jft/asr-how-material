import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  NEXT_PUBLIC_STORE_NAME: z.string().min(1),
  NEXT_PUBLIC_WHATSAPP_PHONE: z.string().min(10),

  PIX_KEY: z.string().min(1),
  PIX_QR_CODE_URL: z.string().url().optional().or(z.literal("")),

  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_REGION: z.string().min(1),
  R2_ENDPOINT: z.string().url(),
  R2_PUBLIC_BASE_URL: z.string().url(),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  PRODUCTS_IMPORT_PATH: z.string().min(1),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_BASE_URL: process.env.APP_BASE_URL,

  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,

  JWT_SECRET: process.env.JWT_SECRET,

  NEXT_PUBLIC_STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME,
  NEXT_PUBLIC_WHATSAPP_PHONE: process.env.NEXT_PUBLIC_WHATSAPP_PHONE,

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

  PRODUCTS_IMPORT_PATH: process.env.PRODUCTS_IMPORT_PATH,
});