# AGENTS.md - Guia do Projeto Meu Concreto

Este arquivo serve como um guia para agentes de IA entenderem a arquitetura, convenções e estrutura do projeto "Meu Concreto".

## 1. Visão Geral do Projeto

**Meu Concreto** é um sistema de gestão (ERP/OS) voltado para empresas de concreto, abrangendo vendas, produção, logística e financeiro.

### Stack Tecnológico

- **Framework Fullstack:** Nuxt 4 (Vue 3 + Nitro)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (via @nuxt/ui)
- **Banco de Dados:** SQLite (LibSQL/Turso)
- **ORM:** Drizzle ORM
- **Validação:** Zod
- **Gerenciador de Pacotes:** Bun
- **Containerização:** Docker

## 2. Estrutura de Diretórios e Arquitetura

O projeto segue a estrutura do Nuxt 4, com separação clara entre frontend (`app/`) e backend (`server/`).

### Diretórios Principais

- **`app/`**: Código do Frontend.

  - `components/`: Componentes Vue reutilizáveis, organizados por domínio (dashboard, sales, quotes, etc.).
  - `pages/`: Rotas da aplicação (file-system routing).
  - `composables/`: Lógica de estado e regras de negócio reutilizáveis (ex: `useAuth`, `useQuotes`).
  - `layouts/`: Layouts de página (auth, default).
  - `middleware/`: Middleware de rota (ex: `auth.global.ts`).
  - `types/`: Definições de tipos TypeScript compartilhados.
  - `utils/`: Funções utilitárias.

- **`server/`**: Código do Backend (Nitro).

  - `api/`: Endpoints da API REST. Organizados por recurso (ex: `auth/`, `customers/`, `quotes/`).
  - `database/`: Configuração do banco de dados.
    - `schema.ts`: Definição do schema do banco de dados (Drizzle).
    - `migrations/`: Arquivos de migração gerados automaticamente.

- **`scripts/`**: Scripts utilitários para manutenção (seed, migrações manuais, verificações).
- **`public/`**: Arquivos estáticos servidos diretamente.

## 3. Comandos de Build e Desenvolvimento

O projeto utiliza **Bun** como runtime e gerenciador de pacotes.

### Comandos Principais (package.json)

- **Instalar dependências:** `bun install`
- **Servidor de desenvolvimento:** `bun run dev` (roda em http://localhost:3000)
- **Build de produção:** `bun run build`
- **Linting:** `bun run lint`

### Banco de Dados (Drizzle Kit)

- **Gerar migrações:** `bun run db:generate` (cria arquivos SQL baseados no schema)
- **Aplicar migrações:** `bun run db:migrate` (aplica SQL ao banco)
- **Push direto (dev):** `bun run db:push` (sincroniza schema sem criar arquivo de migração)
- **Drizzle Studio:** `bun run db:studio` (interface web para visualizar o banco)

## 4. Convenções de Desenvolvimento

### Backend (Server)

- **API Routes:** Localizadas em `server/api`. Use handlers do H3 (`defineEventHandler`).
- **Validação:** Utilize `zod` para validar o corpo das requisições e parâmetros.
- **Banco de Dados:** Use `drizzle-orm` para todas as interações com o banco. Evite SQL bruto, salvo exceções necessárias.
- **Autenticação:** Gerenciada via endpoints em `server/api/auth` e middleware global `app/middleware/auth.global.ts`.

### Frontend (App)

- **Componentes:** Utilize componentes do `@nuxt/ui` sempre que possível para manter a consistência visual.
- **Estado:** Use `composables` para gerenciar estado complexo ou compartilhado.
- **Tipagem:** Mantenha tipos fortes. Definições de entidades devem estar em `app/types/`.

### Estilo de Código

- O projeto utiliza **ESLint** com regras estilísticas configuradas (`@nuxt/eslint`).
- **Indentação e Formatação:** Gerenciadas automaticamente pelo linter.

## 5. Configurações Chave

- **`nuxt.config.ts`**: Configuração principal do Nuxt. Define módulos, runtime config e compatibilidade.
- **`drizzle.config.ts`**: Configuração do Drizzle ORM (caminho do schema, driver SQLite).
- **`eslint.config.mjs`**: Regras de linting.
- **`.env` (não versionado):** Deve conter segredos como `NUXT_SESSION_SECRET` e `DB_FILE_NAME` (ou URL do Turso).

## 6. Considerações de Segurança

- **Variáveis de Ambiente:** Nunca commite segredos. Use `.env` localmente.
- **Autenticação:** O sistema possui fluxo de login. Proteja rotas sensíveis com o middleware de autenticação.
- **Sanitização:** O uso do Drizzle ORM ajuda a prevenir SQL Injection, mas valide sempre a entrada do usuário com Zod.
