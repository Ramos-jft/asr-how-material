# ASR HOW Material

Aplicação web para a operação de materiais da **ASR HOW Brasil**, construída com **Next.js App Router**, **TypeScript**, **React**, **Tailwind CSS v4**, **Prisma** e **PostgreSQL**.

## Escopo do projeto

O projeto atende ao briefing de uma loja restrita com:

- autenticação e RBAC;
- painel administrativo;
- catálogo de produtos;
- importação inicial da planilha de produtos;
- base para controle de estoque;
- base para pedidos, PIX manual, PDV, relatórios e janela de vendas.

## Requisitos locais

- Node.js 22.x
- npm
- Docker Desktop

## Como rodar

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
npm run db:import:products
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

## Usuário inicial

```txt
E-mail: admin@materialasr.local
Senha: Admin@123456
```

Troque esta senha antes de qualquer homologação externa.

## Scripts úteis

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:studio
```

## Estrutura principal

```txt
src/app          Rotas e páginas do Next.js
src/lib          Utilitários, autenticação, Prisma e formatadores
prisma           Schema, migrations e seed
scripts          Scripts operacionais, incluindo importação de produtos
data/import      Planilha inicial de produtos
public/brand     Logos do projeto
```

## Fluxo já implementado

1. Página inicial institucional.
2. Login com senha criptografada.
3. Sessão via JWT em cookie httpOnly.
4. Proteção do painel administrativo por permissão.
5. Dashboard inicial com métricas do banco.
6. Catálogo público com busca, filtro por categoria e paginação.
7. Página de detalhe do produto.
8. Importação da planilha `data/import/ProdutosASRHow.xlsx`.

## Próximas etapas

1. Cadastro e aprovação de clientes.
2. Carrinho e checkout com pedido mínimo de R$ 300,00.
3. Reserva de estoque ao finalizar pedido.
4. PIX manual com confirmação pelo admin.
5. PDV para eventos.
6. Relatórios e exportações.
7. Janela configurável de vendas.
