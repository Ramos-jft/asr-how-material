# Parte 1 — Fundação, infraestrutura, banco e importação inicial

Consolidei o contexto do projeto e vou seguir a arquitetura do seu briefing/plano: loja restrita a clientes aprovados, PDV, PIX manual, reserva de estoque antes do pagamento, pedido mínimo de R$ 300, desconto de 10% acima de R$ 1.000 com validade de 7 dias, relatórios, exportação e mensageria. O plano também já aponta app único em Next.js, PostgreSQL, Prisma e organização por camadas.   

Ponto de atenção: o arquivo `material-asr-how-brasil.zip` **não está disponível** aqui no ambiente atual. Então esta Parte 1 foi montada em cima dos arquivos que eu realmente tenho: briefing, plano, etapas, logos e `ProdutosASRHow.xlsx`.
**Suposição:** a pasta do projeto existe localmente no seu computador, mas o `.zip` não foi anexado nesta conversa.
**Validação:** envie o `.zip` na próxima mensagem se quiser que eu adapte os arquivos exatos da sua base, sem reconstruir do zero.

---

## Decisão técnica fechada para 2026

Vou fixar:

* **Node.js 22.x LTS** no projeto. A Vercel hoje suporta 24.x, 22.x e 20.x, mas o Node 22 está em LTS e o Prisma exige Node `^20.19.0`, `^22.12.0` ou `^24.0.0`, então 22.x é a escolha mais estável para esse stack. O Next.js atual exige no mínimo Node 20.9+, e a linha atual nas docs já está em **Next.js 16.x**; para React, a linha está em **19.2**. ([Node.js][1])
* **Prisma ORM v6**.
* **PostgreSQL 18** no Neon. Hoje o Neon suporta 14 a 18 e a Prisma suporta PostgreSQL 18, então dá para usar o major atual sem sair do suporte. ([Neon][2])
* **Cloudflare R2** para imagens, via API S3-compatible.
* **Resend** para e-mail transacional.
* **Vercel Pro** no go-live. O plano Hobby continua excelente para desenvolvimento e homologação, mas a própria Vercel restringe Hobby a uso pessoal não comercial e o cron no Hobby só executa 1x por dia com precisão horária. ([Vercel][3])

---

## O que eu li na planilha de produtos

Ao inspecionar `ProdutosASRHow.xlsx`, encontrei:

* **415 linhas de produtos**
* categorias mais fortes:

  * `MEDALHÕES` = 320
  * `FOLHETOS` = 24
  * `MATERIAL PROMOCIONAL` = 20
  * `LIVRO` = 11
  * `FICHAS` = 10
  * `CHIPS` = 9
  * `POSTERS` = 8
* colunas úteis para importação:

  * `Código de Barras`
  * `Código Interno`
  * `Descrição`
  * `Nome na Loja Virtual`
  * `Categoria do Produto`
  * `Subcategoria do Produto`
  * `Preço Venda Varejo`
  * `Preço Venda Atacado`
  * `Quantidade Mínima Atacado`
  * `Quantidade em Estoque`
  * `Estoque mínimo`
  * `Ativo`
  * `Unidade`
  * `Marca`
  * `Modelo`

### Mapeamento que vou usar

* `sku` = `Código Interno` ou, se vazio, `Código de Barras`
* `barcode` = `Código de Barras`
* `name` = `Nome na Loja Virtual` ou `Descrição`
* `shortDescription` = `Descrição`
* `fullDescription` = `Descrição do Produto` ou `Descrição`
* `retailPriceCents` = `Preço Por` se for maior que zero; senão `Preço Venda Varejo`
* `wholesalePriceCents` = `Preço Venda Atacado`
* `minWholesaleQty` = `Quantidade Mínima Atacado`
* `stockCurrent` = `Quantidade em Estoque`
* `stockMin` = `Estoque mínimo`
* `category` = `Categoria do Produto`
* `subcategory` = `Subcategoria do Produto`
* `isActive` = `Ativo === "Sim"`

Esse fallback entre `Preço Por` e `Preço Venda Varejo` é importante porque a planilha tem linhas com `Preço Por = 0`, mas com preço de varejo preenchido.

---

# 1) Criar a base do projeto

Dentro da pasta do projeto:

```bash
npm init -y
npm install next@latest react@latest react-dom@latest zod jose bcryptjs @prisma/client resend @aws-sdk/client-s3 slugify date-fns xlsx
npm install -D typescript @types/node @types/react @types/react-dom prisma tsx eslint prettier prettier-plugin-tailwindcss vitest @vitest/coverage-v8 playwright
npx create-next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*" --tailwind --use-npm
```

> Observação prática: como a pasta já existe, rode o `create-next-app` **dentro dela** só se ainda estiver vazia.
> Se ela já tiver arquivos, eu adapto na próxima parte quando você enviar o `.zip`.

---

# 2) `package.json` com engines e scripts

Substitua ou ajuste esta parte:

```json
{
  "name": "material-asr-how-brasil",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": "22.x"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:import:products": "tsx scripts/import-products.ts"
  }
}
```

---

# 3) Banco local para desenvolvimento

## `docker-compose.yml`

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:18-alpine
    container_name: material-asr-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: material_asr
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Subir:

```bash
npm run db:up
```

---

# 4) Variáveis de ambiente

## `.env.example`

```bash
NODE_ENV=development
APP_BASE_URL=http://localhost:3000

# Banco local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/material_asr?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/material_asr?schema=public

# Auth
JWT_SECRET=troque-por-uma-chave-forte-com-32-ou-mais-caracteres

# Loja
NEXT_PUBLIC_STORE_NAME=Material ASR HOW Brasil
NEXT_PUBLIC_WHATSAPP_PHONE=5519999999999

# PIX manual
PIX_KEY=financeiro@seudominio.com.br
PIX_QR_CODE_URL=https://seudominio.com.br/pix-qr.png

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=material-asr-images
R2_REGION=auto
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://cdn.seudominio.com.br

# Resend
RESEND_API_KEY=
EMAIL_FROM=Material ASR HOW Brasil <no-reply@seudominio.com.br>

# Importação
PRODUCTS_IMPORT_PATH=./ProdutosASRHow.xlsx
```

---

# 5) Configuração da Vercel

Para esse projeto, a Vercel entra como hospedagem do app Next.js, preview por branch e cron diário do job de expiração de desconto. O cron diário cabe até no Hobby, mas como a loja é comercial, o plano certo no go-live é Pro. ([Vercel][3])

## Passo a passo no painel

1. Suba o repositório para GitHub.
2. Na Vercel, clique em **Add New > Project**.
3. Importe o repositório.
4. Framework preset: **Next.js**.
5. Em **Settings > Build and Deployment**, ajuste:

   * **Node.js Version** = `22.x`
6. Em **Settings > Environment Variables**, cadastre todas as variáveis do `.env.example`.
7. Em **Domains**, conecte o domínio principal depois.
8. Em **Storage**, **não** use Vercel Blob nesse projeto; mantenha o plano com R2 para evitar retrabalho arquitetural.

## CLI da Vercel

```bash
npm install -g vercel
vercel login
vercel link
vercel env pull .env.local
```

---

# 6) Configuração do Neon

Para Prisma com banco serverless, o ideal é separar URL de runtime e URL direta de migration: `DATABASE_URL` apontando para o pooler e `DIRECT_URL` apontando para a conexão direta. A própria Prisma documenta esse padrão para Neon/Supabase, e o Neon recomenda usar a connection string por ambiente. ([Neon][4])

## Passo a passo

1. Crie um projeto no Neon.
2. Selecione **PostgreSQL 18**.
3. Copie as duas URLs:

   * **pooled** → `DATABASE_URL`
   * **direct** → `DIRECT_URL`
4. Em produção na Vercel:

   * `DATABASE_URL` = host pooler
   * `DIRECT_URL` = host direto
5. Em local:

   * mantenha o Docker Postgres ou use Neon também, mas eu prefiro Docker no dev.

### Exemplo conceitual

```bash
DATABASE_URL=postgresql://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

# 7) Configuração do Cloudflare R2

O R2 expõe uma API compatível com S3 e usa endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; a região para compatibilidade é `auto`. ([Cloudflare Docs][5])

## Passo a passo

1. Cloudflare > **R2**.
2. Crie o bucket:

   * `material-asr-images`
3. Gere **Access Key ID** e **Secret Access Key**.
4. Guarde:

   * `R2_ACCOUNT_ID`
   * `R2_ACCESS_KEY_ID`
   * `R2_SECRET_ACCESS_KEY`
   * `R2_BUCKET`
   * `R2_ENDPOINT`
5. Para URL pública, recomendo subdomínio próprio:

   * `cdn.seudominio.com.br`

**Suposição:** você terá um subdomínio público para servir imagens.
**Validação:** apontar CNAME/custom domain no R2 antes do go-live.

## Cliente R2

### `src/infra/storage/r2-client.ts`

```ts
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export const r2 = new S3Client({
  region: env.R2_REGION,
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});
```

---

# 8) Configuração do Resend

O Resend documenta o fluxo com SDK Node.js e verificação de domínio. Para esse projeto, ele fica responsável pelos e-mails transacionais; o WhatsApp continua como **link com mensagem pronta**, sem API no MVP, exatamente como o briefing prevê. ([Resend][6])

## Passo a passo

1. Crie conta no Resend.
2. Adicione o domínio:

   * `seudominio.com.br`
3. Configure os registros DNS pedidos:

   * SPF
   * DKIM
4. Gere a API key.
5. Defina:

   * `RESEND_API_KEY`
   * `EMAIL_FROM`

### Cliente Resend

#### `src/infra/email/resend-client.ts`

```ts
import { Resend } from "resend";
import { env } from "@/lib/env";

export const resend = new Resend(env.RESEND_API_KEY);
```

---

# 9) Validação central das variáveis de ambiente

## `src/lib/env.ts`

```ts
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
```

---

# 10) Prisma client singleton

## `src/lib/prisma.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

# 11) Modelagem inicial do banco

Essa modelagem já nasce preparada para:

* RBAC
* clientes aprovados/temporários
* catálogo com categoria/subcategoria
* estoque auditável
* pedidos com desconto, complemento e reserva
* PDV
* janela de vendas
* notificações

Tudo isso está alinhado ao briefing e ao plano sênior.   

## `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum CustomerStatus {
  PENDING
  TEMPORARY
  APPROVED
  BLOCKED
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  OUT_OF_STOCK
}

enum OrderStatus {
  AWAITING_PAYMENT
  PENDING_COMPLEMENT
  PAID_CONFIRMED
  SHIPPED
  COMPLETED
  CANCELLED
}

enum OrderSource {
  ONLINE
  PDV
}

enum PaymentMethod {
  PIX
  CASH
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  CANCELLED
}

enum StockMovementType {
  ENTRY
  ADJUSTMENT
  RESERVE
  SALE
  PDV_SALE
  RETURN
  CANCEL_RELEASE
}

enum NotificationChannel {
  EMAIL
  WHATSAPP
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}

enum StoreWindowStatus {
  SCHEDULED
  OPEN
  CLOSED
}

model User {
  id                String       @id @default(cuid())
  name              String
  email             String       @unique
  passwordHash      String
  status            UserStatus   @default(ACTIVE)
  lastLoginAt       DateTime?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  customer          Customer?
  roles             UserRole[]
  auditLogs         AuditLog[]
  stockMovements    StockMovement[]
  confirmedPayments Payment[]    @relation("PaymentConfirmedBy")
  approvedCustomers Customer[]   @relation("CustomerApprovedBy")
  createdOrders     Order[]      @relation("OrderCreatedBy")
}

model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  users       UserRole[]
  permissions RolePermission[]
}

model Permission {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  roles       RolePermission[]
}

model UserRole {
  userId     String
  roleId     String
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}

model RolePermission {
  roleId       String
  permissionId String
  createdAt    DateTime   @default(now())

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model Customer {
  id                        String          @id @default(cuid())
  userId                    String?         @unique
  name                      String
  csaName                   String?
  charge                    String?
  phone                     String
  email                     String          @unique
  groupCode                 String
  status                    CustomerStatus  @default(PENDING)
  temporaryPurchaseRemaining Int            @default(0)
  approvedAt                DateTime?
  approvedByUserId          String?
  createdAt                 DateTime        @default(now())
  updatedAt                 DateTime        @updatedAt

  user                      User?           @relation(fields: [userId], references: [id], onDelete: SetNull)
  approvedBy                User?           @relation("CustomerApprovedBy", fields: [approvedByUserId], references: [id], onDelete: SetNull)
  address                   CustomerAddress?
  orders                    Order[]
  notifications             NotificationLog[]

  @@index([status])
}

model CustomerAddress {
  id          String    @id @default(cuid())
  customerId  String    @unique
  zipCode     String
  state       String
  city        String
  district    String
  street      String
  number      String
  complement  String?
  reference   String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
}

model Category {
  id               String     @id @default(cuid())
  name             String
  slug             String     @unique
  parentId         String?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  parent           Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children         Category[] @relation("CategoryTree")
  primaryProducts  Product[]  @relation("ProductPrimaryCategory")
  secondaryProducts Product[] @relation("ProductSecondaryCategory")
}

model Product {
  id                  String         @id @default(cuid())
  sku                 String         @unique
  barcode             String?
  externalId          String?
  name                String
  slug                String         @unique
  shortDescription    String?
  fullDescription     String?
  unit                String?
  typeLabel           String?
  brand               String?
  model               String?
  retailPriceCents    Int
  wholesalePriceCents Int?
  minWholesaleQty     Int?
  isActive            Boolean        @default(true)
  status              ProductStatus  @default(ACTIVE)
  stockCurrent        Int            @default(0)
  stockMin            Int            @default(0)
  categoryId          String?
  subcategoryId       String?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  category            Category?      @relation("ProductPrimaryCategory", fields: [categoryId], references: [id], onDelete: SetNull)
  subcategory         Category?      @relation("ProductSecondaryCategory", fields: [subcategoryId], references: [id], onDelete: SetNull)
  images              ProductImage[]
  orderItems          OrderItem[]
  stockMovements      StockMovement[]

  @@index([name])
  @@index([categoryId])
  @@index([status])
}

model ProductImage {
  id          String    @id @default(cuid())
  productId   String
  url         String
  alt         String?
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, sortOrder])
}

model StoreWindow {
  id          String            @id @default(cuid())
  startsAt    DateTime
  endsAt      DateTime
  status      StoreWindowStatus @default(SCHEDULED)
  message     String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  orders      Order[]

  @@index([startsAt, endsAt])
}

model Order {
  id                    String      @id @default(cuid())
  code                  String      @unique
  source                OrderSource @default(ONLINE)
  customerId            String?
  createdByUserId       String?
  storeWindowId         String?
  status                OrderStatus @default(AWAITING_PAYMENT)
  subtotalCents         Int
  discountCentsApplied  Int         @default(0)
  totalDueCents         Int
  additionalDueCents    Int         @default(0)
  discountExpiresAt     DateTime?
  discountExpiredAt     DateTime?
  paidAt                DateTime?
  cancelledAt           DateTime?
  reservedAt            DateTime    @default(now())
  notes                 String?
  shippingAddressJson   Json?
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  customer              Customer?   @relation(fields: [customerId], references: [id], onDelete: SetNull)
  createdBy             User?       @relation("OrderCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  storeWindow           StoreWindow? @relation(fields: [storeWindowId], references: [id], onDelete: SetNull)
  items                 OrderItem[]
  payments              Payment[]
  notifications         NotificationLog[]
  stockMovements        StockMovement[]

  @@index([customerId])
  @@index([status])
  @@index([createdAt])
  @@index([source])
}

model OrderItem {
  id               String    @id @default(cuid())
  orderId          String
  productId        String?
  sku              String
  name             String
  unit             String?
  quantity         Int
  unitPriceCents   Int
  lineTotalCents   Int
  wholesaleApplied Boolean   @default(false)
  createdAt        DateTime  @default(now())

  order            Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product          Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([productId])
}

model Payment {
  id                  String        @id @default(cuid())
  orderId             String
  method              PaymentMethod
  status              PaymentStatus @default(PENDING)
  receivedAmountCents Int
  differenceCents     Int           @default(0)
  proofUrl            String?
  notes               String?
  confirmedByUserId   String?
  confirmedAt         DateTime?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  order               Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  confirmedBy         User?         @relation("PaymentConfirmedBy", fields: [confirmedByUserId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([status])
}

model StockMovement {
  id            String            @id @default(cuid())
  productId     String
  orderId       String?
  userId        String?
  type          StockMovementType
  quantity      Int
  previousStock Int
  newStock      Int
  reason        String?
  metadata      Json?
  createdAt     DateTime          @default(now())

  product       Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
  order         Order?            @relation(fields: [orderId], references: [id], onDelete: SetNull)
  user          User?             @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([productId])
  @@index([orderId])
  @@index([type])
  @@index([createdAt])
}

model AuditLog {
  id         String    @id @default(cuid())
  userId     String?
  action     String
  entity     String
  entityId   String
  payload    Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime  @default(now())

  user       User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entity, entityId])
  @@index([createdAt])
}

model NotificationLog {
  id           String             @id @default(cuid())
  orderId      String?
  customerId   String?
  channel      NotificationChannel
  templateKey  String
  status       NotificationStatus @default(PENDING)
  providerId   String?
  recipient    String
  payload      Json?
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  order        Order?             @relation(fields: [orderId], references: [id], onDelete: SetNull)
  customer     Customer?          @relation(fields: [customerId], references: [id], onDelete: SetNull)

  @@index([channel, status])
  @@index([createdAt])
}
```

Gerar client e migration:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

---

# 12) Seed inicial de RBAC

## `prisma/seed.ts`

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: "ADMIN", description: "Acesso total" },
    { name: "PDV_OPERATOR", description: "Operador de PDV" },
    { name: "STOCK_OPERATOR", description: "Estoquista" },
    { name: "SUPPORT", description: "Atendimento" },
    { name: "CUSTOMER", description: "Cliente" },
  ];

  const permissions = [
    "dashboard.read",
    "reports.read",
    "reports.export",
    "products.read",
    "products.create",
    "products.update",
    "products.images.upload",
    "stock.read",
    "stock.adjust",
    "customers.read",
    "customers.approve",
    "orders.read",
    "orders.update_status",
    "orders.cancel_release",
    "payments.confirm_pix",
    "pdv.create_order",
    "store_window.manage",
    "notifications.send",
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: role,
      create: role,
    });
  }

  for (const name of permissions) {
    await prisma.permission.upsert({
      where: { name },
      update: { name },
      create: { name },
    });
  }

  const roleMap = Object.fromEntries(
    (await prisma.role.findMany()).map((role) => [role.name, role.id]),
  );

  const permissionMap = Object.fromEntries(
    (await prisma.permission.findMany()).map((permission) => [
      permission.name,
      permission.id,
    ]),
  );

  const grants: Record<string, string[]> = {
    ADMIN: permissions,
    PDV_OPERATOR: [
      "products.read",
      "stock.read",
      "orders.read",
      "pdv.create_order",
    ],
    STOCK_OPERATOR: ["products.read", "stock.read", "stock.adjust"],
    SUPPORT: ["orders.read", "orders.update_status", "notifications.send"],
    CUSTOMER: [],
  };

  for (const [roleName, grantedPermissions] of Object.entries(grants)) {
    for (const permissionName of grantedPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roleMap[roleName],
            permissionId: permissionMap[permissionName],
          },
        },
        update: {},
        create: {
          roleId: roleMap[roleName],
          permissionId: permissionMap[permissionName],
        },
      });
    }
  }

  const adminPasswordHash = await bcrypt.hash("Admin@123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@materialasr.local" },
    update: {
      name: "Administrador Inicial",
      passwordHash: adminPasswordHash,
    },
    create: {
      name: "Administrador Inicial",
      email: "admin@materialasr.local",
      passwordHash: adminPasswordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: roleMap.ADMIN,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: roleMap.ADMIN,
    },
  });

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Rodar:

```bash
npm run db:seed
```

---

# 13) Script de importação da planilha

## `scripts/import-products.ts`

```ts
import path from "node:path";
import xlsx from "xlsx";
import slugify from "slugify";
import { PrismaClient, ProductStatus } from "@prisma/client";
import { env } from "../src/lib/env";

type SpreadsheetRow = {
  "Código de Barras"?: string;
  "Tipo de Produto"?: string;
  "Descrição"?: string;
  "Preço de Custo"?: number;
  "Preço Venda Varejo"?: number;
  "Preço Venda Atacado"?: number;
  "Quantidade Mínima Atacado"?: number;
  "Unidade"?: string;
  "Ativo"?: string;
  "Categoria do Produto"?: string;
  "Subcategoria do Produto"?: string;
  "Quantidade em Estoque"?: number;
  "Estoque mínimo"?: number;
  "Marca"?: string;
  "Modelo"?: string;
  "Código Interno"?: string;
  "Nome na Loja Virtual"?: string;
  "Preço Por"?: number;
  "Descrição do Produto"?: string;
};

const prisma = new PrismaClient();

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function toCents(value: number | null): number {
  if (!value || value <= 0) return 0;
  return Math.round(value * 100);
}

function makeSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, locale: "pt" });
}

async function ensureCategory(
  name: string,
  parentId?: string,
  parentSlug?: string,
): Promise<{ id: string; slug: string }> {
  const slugBase = parentSlug ? `${parentSlug}-${name}` : name;
  const slug = makeSlug(slugBase);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return { id: existing.id, slug: existing.slug };

  const created = await prisma.category.create({
    data: {
      name,
      slug,
      parentId,
    },
  });

  return { id: created.id, slug: created.slug };
}

async function main() {
  const filePath = path.resolve(env.PRODUCTS_IMPORT_PATH);
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Nenhuma aba encontrada na planilha.");
  }

  const rows = xlsx.utils.sheet_to_json<SpreadsheetRow>(
    workbook.Sheets[sheetName],
    {
      defval: null,
    },
  );

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const sku =
      normalizeString(row["Código Interno"]) ??
      normalizeString(row["Código de Barras"]);

    const barcode = normalizeString(row["Código de Barras"]);
    const name =
      normalizeString(row["Nome na Loja Virtual"]) ??
      normalizeString(row["Descrição"]);

    if (!sku || !name) {
      skipped++;
      continue;
    }

    const retailPrice =
      (normalizeNumber(row["Preço Por"]) ?? 0) > 0
        ? normalizeNumber(row["Preço Por"])
        : normalizeNumber(row["Preço Venda Varejo"]);

    const wholesalePrice = normalizeNumber(row["Preço Venda Atacado"]);
    const stockCurrent = normalizeNumber(row["Quantidade em Estoque"]) ?? 0;
    const stockMin = normalizeNumber(row["Estoque mínimo"]) ?? 0;
    const minWholesaleQty =
      normalizeNumber(row["Quantidade Mínima Atacado"]) ?? null;

    const retailPriceCents = toCents(retailPrice);
    const wholesalePriceCents =
      wholesalePrice && wholesalePrice > 0 ? toCents(wholesalePrice) : null;

    if (retailPriceCents <= 0) {
      console.warn(`Produto ignorado por preço inválido: ${sku} - ${name}`);
      skipped++;
      continue;
    }

    const categoryName = normalizeString(row["Categoria do Produto"]);
    const subcategoryName = normalizeString(row["Subcategoria do Produto"]);

    let categoryId: string | null = null;
    let subcategoryId: string | null = null;
    let categorySlug: string | null = null;

    if (categoryName) {
      const category = await ensureCategory(categoryName);
      categoryId = category.id;
      categorySlug = category.slug;
    }

    if (subcategoryName && categoryId && categorySlug) {
      const subcategory = await ensureCategory(
        subcategoryName,
        categoryId,
        categorySlug,
      );
      subcategoryId = subcategory.id;
    }

    const isActive = normalizeString(row["Ativo"]) === "Sim";

    const status = !isActive
      ? ProductStatus.INACTIVE
      : stockCurrent <= 0
        ? ProductStatus.OUT_OF_STOCK
        : ProductStatus.ACTIVE;

    await prisma.product.upsert({
      where: { sku },
      update: {
        barcode,
        externalId: normalizeString(row["Código Interno"]),
        name,
        slug: `${makeSlug(name)}-${makeSlug(sku)}`,
        shortDescription: normalizeString(row["Descrição"]),
        fullDescription:
          normalizeString(row["Descrição do Produto"]) ??
          normalizeString(row["Descrição"]),
        unit: normalizeString(row["Unidade"]),
        typeLabel: normalizeString(row["Tipo de Produto"]),
        brand: normalizeString(row["Marca"]),
        model: normalizeString(row["Modelo"]),
        retailPriceCents,
        wholesalePriceCents,
        minWholesaleQty,
        isActive,
        status,
        stockCurrent,
        stockMin,
        categoryId,
        subcategoryId,
      },
      create: {
        sku,
        barcode,
        externalId: normalizeString(row["Código Interno"]),
        name,
        slug: `${makeSlug(name)}-${makeSlug(sku)}`,
        shortDescription: normalizeString(row["Descrição"]),
        fullDescription:
          normalizeString(row["Descrição do Produto"]) ??
          normalizeString(row["Descrição"]),
        unit: normalizeString(row["Unidade"]),
        typeLabel: normalizeString(row["Tipo de Produto"]),
        brand: normalizeString(row["Marca"]),
        model: normalizeString(row["Modelo"]),
        retailPriceCents,
        wholesalePriceCents,
        minWholesaleQty,
        isActive,
        status,
        stockCurrent,
        stockMin,
        categoryId,
        subcategoryId,
      },
    });

    imported++;
  }

  console.log({
    imported,
    skipped,
    filePath,
  });
}

main()
  .catch((error) => {
    console.error("Falha na importação:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Rodar:

```bash
npm run db:import:products
```

---

# 14) Ordem correta de execução desta Parte 1

```bash
npm install
npm run db:up
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run db:import:products
npm run dev
```

---

# 15) Checklist de validação da Parte 1

* projeto sobe em `http://localhost:3000`
* Prisma conecta no banco sem erro
* tabelas foram criadas
* seed criou:

  * roles
  * permissions
  * admin inicial
* importação carregou categorias e subcategorias
* produtos entraram com:

  * `sku`
  * `name`
  * `retailPriceCents`
  * `stockCurrent`
  * `stockMin`
  * `status`
* produtos sem estoque ficaram `OUT_OF_STOCK`
* produto inativo ficou `INACTIVE`
* nenhuma linha foi descartada por falta de `sku` ou `name` sem log explícito

---

# 16) Trade-offs que fechei aqui

## Banco local + Neon em produção

Eu mantive **Postgres local via Docker** e **Neon na nuvem**. Isso acelera desenvolvimento e mantém o modelo igual ao de produção.

## Resend em vez de SMTP Gmail

No material anterior apareceu Gmail como caminho rápido, mas aqui eu fechei com **Resend** porque ele já nasce mais adequado para fluxo transacional e evita retrabalho quando o volume crescer. O próprio plano sênior aponta Resend como stack recomendada.   ([Resend][6])

## PostgreSQL 18

Escolhi **PG 18** porque hoje ele já está no suporte da Prisma e do Neon. ([Neon][2])

---

# 17) O que falta depois desta Parte 1

A próxima etapa natural é:

* Auth com JWT em cookie httpOnly
* middleware de RBAC
* cadastro/aprovação de clientes
* catálogo público + admin de produtos
* upload de imagens no R2

Quando você disser **“continue”**, eu sigo com a **Parte 2** já no mesmo contexto do projeto.

[1]: https://nodejs.org/blog/release/v22.22.1?utm_source=chatgpt.com "Node.js — Node.js 22.22.1 (LTS)"
[2]: https://neon.com/docs/changelog/2026-02-27?utm_source=chatgpt.com "Changelog Feb 27, 2026 - Neon"
[3]: https://vercel.com/docs/limits/fair-use-guidelines?utm_source=chatgpt.com "Fair Use Guidelines"
[4]: https://neon.com/docs/get-started-with-neon/connect-neon?utm_source=chatgpt.com "Connecting Neon to your stack - Neon Docs"
[5]: https://developers.cloudflare.com/r2/api/s3/api/?utm_source=chatgpt.com "S3 API compatibility · Cloudflare R2 docs"
[6]: https://resend.com/docs/send-with-nodejs?utm_source=chatgpt.com "Send emails with Node.js - Resend"
