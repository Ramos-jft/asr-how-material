import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }

  return value;
}

function createR2Client() {
  return new S3Client({
    region: process.env.R2_REGION?.trim() || "auto",
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

async function main() {
  const bucket = getRequiredEnv("R2_BUCKET");
  const publicBaseUrl = getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");

  const key = `debug/r2-smoke-test-${Date.now()}.svg`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#2f2b89"/>
  <circle cx="260" cy="40" r="32" fill="#0b8ddf"/>
  <text x="32" y="96" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="700">R2 OK</text>
  <text x="32" y="128" fill="#ffffff" font-family="Arial, sans-serif" font-size="14">Material ASR HOW Brasil</text>
</svg>`.trim();

  const client = createR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new TextEncoder().encode(svg),
      ContentType: "image/svg+xml",
      CacheControl: "no-store",
    }),
  );

  const publicUrl = `${publicBaseUrl}/${key}`;

  console.log("Upload enviado para o R2 com sucesso.");
  console.log(`Bucket: ${bucket}`);
  console.log(`Key: ${key}`);
  console.log(`URL pública: ${publicUrl}`);

  const response = await fetch(publicUrl);

  if (!response.ok) {
    throw new Error(
      `Upload funcionou, mas a URL pública não abriu. Status HTTP: ${response.status}`,
    );
  }

  console.log("URL pública validada com sucesso.");
}

try {
  await main();
} catch (error) {
  console.error("Falha ao testar upload no R2:", error);
  process.exitCode = 1;
}
