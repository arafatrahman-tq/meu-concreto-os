# AGENTS.md - Guia Técnico do Projeto Meu Concreto

Este documento é voltado para agentes de IA que vão trabalhar neste repositório sem contexto prévio.
Tudo abaixo foi levantado a partir dos arquivos atuais do projeto.

## 1. Visão Geral do Projeto

Meu Concreto é um sistema de gestão para concreteiras, com foco em operação comercial e financeira:

- empresas e usuários (multi-tenant)
- clientes
- produtos, insumos e traços
- orçamentos e vendas
- agendamentos
- transações financeiras
- notificações
- integração com WhatsApp (alertas, relatórios e envio de PDF)

Arquitetura fullstack baseada em Nuxt:

- frontend em `app/` (Vue 3)
- backend API em `server/api/` (Nitro/H3)
- persistência via Drizzle + LibSQL (SQLite/Turso)

## 2. Stack e Arquivos de Configuração-Chave

Principais tecnologias observadas:

- Nuxt `^4.3.1`
- Vue 3 + TypeScript
- `@nuxt/ui` `^4.4.0` + Tailwind CSS 4
- Bun (`packageManager: bun@1.3.9`)
- Drizzle ORM + drizzle-kit
- `@libsql/client` / `libsql`
- Zod para validação
- bcryptjs para senha
- jsPDF + jspdf-autotable para PDF

Arquivos de configuração principais:

- `package.json`: scripts, dependências, runtime e ferramentas
- `nuxt.config.ts`: módulos (`@nuxt/eslint`, `@nuxt/ui`), runtimeConfig, Nitro externals, compat date
- `drizzle.config.ts`: schema e saída de migrações
- `eslint.config.mjs`: regra de lint custom (`no-explicit-any` como `warn`)
- `tsconfig.json`: referências Nuxt geradas em `.nuxt/`
- `Dockerfile`: build/runtime com Bun Alpine e ajustes de dependências nativas libsql
- `docker-compose.yml`: serviço de produção com volume `./data:/app/data`
- `.editorconfig`: padrão de indentação 2 espaços + LF
- `.gitignore`/`.dockerignore`: ignoram artefatos de build, env local e banco local

Observação importante: o `README.md` atual ainda está como template padrão Nuxt UI e não reflete este projeto.

## 3. Organização de Código

### 3.1 Frontend (`app/`)

Divisão principal:

- `app/pages/`: rotas da aplicação (`index`, `clientes`, `produtos`, `transacoes`, `orcamentos`, `vendas`, `mobile` etc.)
- `app/components/`: componentes por domínio (`companies/`, `customers/`, `inventory/`, `mix-designs/`, `quotes/`, `sales/`, `transactions/` etc.)
- `app/composables/`: lógica de estado e acesso à API (`useAuth`, `useQuotes`, `useSales`, `useNotifications` etc.)
- `app/types/`: contratos TypeScript por domínio
- `app/middleware/auth.global.ts`: proteção de rotas client-side
- `app/plugins/auth.ts`: intercepta erros 401 de `$fetch` para limpar sessão local e redirecionar
- `app/layouts/default.vue` e `app/layouts/auth.vue`: layout desktop/mobile e autenticação

Fluxo de autenticação no cliente:

- composable `useAuth` usa cookies `mc_user`, `mc_companies`, `mc_active_company`
- estado global sincronizado via `useState`
- middleware de rota bloqueia páginas privadas quando não autenticado

### 3.2 Backend (`server/`)

Divisão principal:

- `server/api/`: endpoints H3 organizados por recurso
- `server/middleware/auth.ts`: autenticação para `/api/*`
- `server/utils/`: db, sessão, schemas Zod, WhatsApp, PDF, notificações, rate limit
- `server/database/schema.ts`: schema Drizzle completo
- `server/database/migrations/`: histórico de migrações SQL
- `server/types.d.ts`: tipagem de `event.context.auth`

Padrão de rotas de API:

- list/create: `recurso.get.ts`, `recurso.post.ts`
- item: `recurso/[id].get.ts`, `[id].put.ts`, `[id].delete.ts`
- ações extras por item (exemplo em `sales/[id]/` e `quotes/[id]/`): `download.get.ts`, `send-pdf.post.ts`

## 4. Arquitetura de Runtime

1. Cliente Nuxt renderiza páginas e chama `/api/*`.
2. `server/middleware/auth.ts` valida sessão para rotas privadas.
3. Handlers validam payload/query com Zod (`server/utils/schemas.ts`).
4. Persistência com Drizzle em SQLite/LibSQL.
5. Funcionalidades auxiliares:
   - geração de PDF
   - envio WhatsApp
   - criação de notificações internas

Detalhes técnicos relevantes:

- `server/utils/db.ts` usa inicialização lazy do client LibSQL para evitar travamento no build
- `parseDate()` normaliza datas para evitar deslocamento de timezone em campos `YYYY-MM-DD`
- `runtimeConfig.sessionSecret` existe, porém sessão efetiva usa `NUXT_SESSION_SECRET` em `server/utils/session.ts`
- em produção, ausência de `NUXT_SESSION_SECRET` lança erro e impede subida

## 5. Banco de Dados e Modelo de Domínio

O schema em `server/database/schema.ts` define:

- multi-tenant por `companyId` na maioria das tabelas
- vínculo usuário-empresa via `user_companies`
- autenticação em `user_auth`
- entidades operacionais: `products`, `quotes`, `quote_items`, `sales`, `sale_items`, `transactions`
- logística/comercial: `sellers`, `drivers`, `pumpers`, `schedules`
- produção: `materials`, `mix_designs`, `mix_design_items`
- comunicação: `notifications`, `whatsapp_settings`

Convenção de valores monetários:

- armazenados como inteiro em centavos (`price`, `subtotal`, `total`, `amount`)

## 6. Build, Execução e Banco

Comandos oficiais (em `package.json`, usando Bun):

- instalar dependências: `bun install`
- desenvolvimento: `bun run dev`
- build: `bun run build`
- preview local: `bun run preview`
- lint: `bun run lint`
- typecheck: `bun run typecheck`

Drizzle:

- gerar migrações: `bun run db:generate`
- aplicar migrações: `bun run db:migrate`
- sincronizar schema direto (dev): `bun run db:push`
- drizzle studio: `bun run db:studio`

Scripts utilitários existentes (não estão no bloco `scripts` do package):

- `bun run scripts/seed.ts`
- `bun run scripts/seed-demo.ts`
- `bun run scripts/check-fk.ts`
- `bun run scripts/migrate-whatsapp.ts`
- `bun run scripts/validate-rbac.ts`

## 7. Convenções de Desenvolvimento

Padrões observados no código:

- idioma predominante: português (mensagens de erro, comentários e textos de UI)
- validação de entrada via Zod antes de persistir
- checagens explícitas de autorização por empresa com `requireCompanyAccess`
- controles de papel com `requireAdmin`/`requireManager` onde necessário
- uso de transações Drizzle em operações compostas (ex.: criação/edição de venda + itens)
- estilo de código com 2 espaços, LF, TypeScript estrito via Nuxt references

Nuxt 4:

- manter estrutura em `app/` e `server/`
- preferir componentes do `@nuxt/ui` para novas telas

## 8. Testes e Qualidade

Estado atual:

- não há suíte de testes automatizados (Vitest/Playwright/Jest) configurada
- também não há script `test` no `package.json`
- `scripts/validate-rbac.ts` é um roteiro de validação manual, não um teste automatizado

CI/CD:

- não existe diretório `.github/workflows/` neste repositório atual

## 9. Segurança e Pontos de Atenção

Autenticação/sessão:

- sessão server-side com cookie `mc_session` (httpOnly, sameSite=lax, secure em produção)
- middleware de API protege `/api/*`, exceto:
  - `/api/auth/login`
  - `/api/auth/mobile-login`
  - `/api/auth/mobile-companies`
  - `/api/setup-admin`

Pontos críticos para produção:

- definir `NUXT_SESSION_SECRET` (>= 32 chars)
- definir `DB_FILE_NAME` (ex.: `file:/app/data/local.db`)
- não expor endpoint `setup-admin` em ambiente público sem controle de acesso

Observação operacional importante:

- `docker-compose.yml` usa `SESSION_SECRET`, mas o código de sessão exige `NUXT_SESSION_SECRET`
- os endpoints de cron do WhatsApp (`/api/whatsapp/process-reminders` e `/api/whatsapp/process-reports`) estão documentados como cron-only, porém continuam sob middleware de autenticação padrão de `/api/*`

## 10. Deploy

### 10.1 Docker

`Dockerfile` multi-stage (Bun Alpine):

- stage de build instala toolchain (`python3 make g++`) para dependências nativas
- build Nuxt gera `.output/`
- stage runtime reinstala dependências de produção dentro de `.output/server` para garantir binários `@libsql` corretos
- comando final: `bun ./.output/server/index.mjs`

### 10.2 Docker Compose

Arquivo `docker-compose.yml` define:

- serviço único `app`
- porta `3000:3000`
- volume `./data:/app/data`
- healthcheck por HTTP local

### 10.3 Tarefas agendadas

`COOLIFY_CRON_SETUP.md` descreve configuração de cron no Coolify para endpoints de WhatsApp.
Antes de usar em produção, valide a estratégia de autenticação desses endpoints conforme seção de segurança.

## 11. Diretrizes para Agentes de IA

Ao alterar o projeto:

1. Preserve o modelo multi-tenant (`companyId` + `requireCompanyAccess`).
2. Mantenha validação Zod em todos os handlers novos/alterados.
3. Ao mudar schema, atualize `server/database/schema.ts` e gere migração com `bun run db:generate`.
4. Não introduza valores monetários em float persistido; use centavos (inteiro).
5. Priorize coerência com a organização por domínio já existente em `app/components` e `server/api`.
