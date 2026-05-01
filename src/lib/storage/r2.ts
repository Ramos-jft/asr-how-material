import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

import { env } from "@/lib/env";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedImageContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const imageExtensionsByContentType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type R2Config = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  publicBaseUrl: string;
};

type UploadProductImageToR2Input = {
  productId: string;
  file: File;
};

type UploadProductImageToR2Result = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

function getR2Config(): R2Config {
  const bucket = env.R2_BUCKET;
  const endpoint = env.R2_ENDPOINT;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL;
  const region = env.R2_REGION ?? "auto";

  if (
    !bucket ||
    !endpoint ||
    !accessKeyId ||
    !secretAccessKey ||
    !publicBaseUrl
  ) {
    throw new Error(
      "Cloudflare R2 não configurado. Defina R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_PUBLIC_BASE_URL.",
    );
  }

  return {
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    region,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
  };
}

function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function assertValidImageFile(file: File): void {
  if (file.size <= 0) {
    throw new Error("Selecione uma imagem válida.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  if (!allowedImageContentTypes.has(file.type)) {
    throw new Error("Formato inválido. Envie imagem JPG, PNG ou WebP.");
  }
}

function createProductImageKey(input: {
  productId: string;
  contentType: string;
}): string {
  const extension = imageExtensionsByContentType[input.contentType];

  if (!extension) {
    throw new Error("Tipo de imagem não suportado.");
  }

  return `products/${input.productId}/${Date.now()}-${randomUUID()}.${extension}`;
}

export async function uploadProductImageToR2({
  productId,
  file,
}: UploadProductImageToR2Input): Promise<UploadProductImageToR2Result> {
  assertValidImageFile(file);

  const config = getR2Config();
  const client = createR2Client(config);

  const key = createProductImageKey({
    productId,
    contentType: file.type,
  });

  const arrayBuffer = await file.arrayBuffer();
  const body = new Uint8Array(arrayBuffer);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: `${config.publicBaseUrl}/${key}`,
    contentType: file.type,
    size: file.size,
  };
}
