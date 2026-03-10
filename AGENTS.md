# AGENTS.md - Guia Técnico do Projeto Meu Concreto

Este documento é voltado para agentes de IA que vão trabalhar neste repositório sem contexto prévio. Tudo abaixo foi levantado a partir dos arquivos atuais do projeto.

## 1. Visão Geral do Projeto

Meu Concreto é um sistema de gestão completo para concreteiras, com foco em operação comercial e financeira:

- **Multi-tenant**: empresas e usuários com controle de acesso por empresa
- **Cadastros**: clientes, produtos (concreto, bombeamento, etc.), insumos e traços
- **Comercial**: orçamentos, vendas, vendedores, motoristas, bombeadores
- **Financeiro**: transações, formas de pagamento, fluxo de caixa
- **Logística**: agendamentos de entrega
- **Notificações**: sistema interno de notificações + integração com WhatsApp

Arquitetura fullstack baseada em Nuxt 4:

- Frontend em `app/` (Vue 3 + TypeScript)
- Backend API em `server/api/` (Nitro/H3)
- Persistência via Drizzle ORM + LibSQL (SQLite/Turso)

## 2. Stack e Arquivos de Configuração

### 2.1 Principais Tecnologias

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Nuxt | ^4.3.1 | Framework fullstack |
| Vue 3 | (via Nuxt) | UI reativa |
| TypeScript | ^5.9.3 | Tipagem estática |
| @nuxt/ui | ^4.4.0 | Componentes UI + Tailwind CSS 4 |
| Bun | 1.3.9 | Runtime e package manager |
| Drizzle ORM | ^0.45.1 | ORM para banco de dados |
| drizzle-kit | ^0.31.9 | Migrações e CLI do Drizzle |
| @libsql/client | ^0.17.0 | Cliente SQLite/Turso |
| Zod | 3.24.1 | Validação de schemas |
| bcryptjs | ^3.0.3 | Hash de senhas |
| jsPDF | ^4.2.0 | Geração de PDFs |
| date-fns | ^4.1.0 | Manipulação de datas |

### 2.2 Arquivos de Configuração Principais

- **`package.json`**: scripts, dependências, define Bun como package manager
- **`nuxt.config.ts`**: módulos (@nuxt/eslint, @nuxt/ui), runtimeConfig (sessionSecret), Nitro externals, compat date
- **`drizzle.config.ts`**: schema em `./server/database/schema.ts`, saída em `./server/database/migrations`
- **`eslint.config.mjs`**: configuração do ESLint com regra custom (`@typescript-eslint/no-explicit-any: warn`)
- **`tsconfig.json`**: referências para tsconfigs gerados em `.nuxt/`
- **`app/app.config.ts`**: configuração do @nuxt/ui (cores, estilos de componentes)
- **`.editorconfig`**: indentação com 2 espaços, LF, UTF-8
- **`Dockerfile`**: build multi-stage com Bun Alpine, tratamento especial para binários nativos @libsql
- **`docker-compose.yml`**: serviço de produção com volume `./data:/app/data`

### 2.3 Configuração de Runtime Importante

```typescript
// nuxt.config.ts - runtimeConfig
runtimeConfig: {
  sessionSecret: process.env.NUXT_SESSION_SECRET || "meu-concreto-dev-only-secret-change-in-production!!"
}
```

**Variáveis de ambiente obrigatórias em produção:**
- `NUXT_SESSION_SECRET`: string >= 32 caracteres para criptografia de sessão
- `DB_FILE_NAME`: caminho do banco SQLite (ex: `file:/app/data/local.db`)

## 3. Organização de Código

### 3.1 Frontend (`app/`)

```
app/
├── app.config.ts          # Configuração do Nuxt UI
├── app.vue                # Root component com splash screen
├── assets/css/main.css    # Tailwind + tema customizado
├── components/            # Componentes por domínio
│   ├── companies/         # CompanySwitcher, CompanyDrawer
│   ├── customers/         # CustomerDrawer
│   ├── dashboard/         # KPIs, gráficos, cards
│   ├── inventory/         # MaterialDrawer
│   ├── mix-designs/       # MixDesignDrawer
│   ├── quotes/            # QuotesTable, QuotesDrawer, QuotesModals
│   ├── sales/             # SalesTable, SalesDrawer, SalesModals
│   ├── transactions/      # TransactionList, TransactionFilters, etc.
│   └── settings/          # Cards de configurações
├── composables/           # Lógica de estado e acesso à API
│   ├── useAuth.ts         # Autenticação e estado do usuário
│   ├── useQuotes.ts       # Operações com orçamentos
│   ├── useSales.ts        # Operações com vendas
│   ├── useNotifications.ts
│   └── dashboard/         # Composables do dashboard
├── layouts/
│   ├── default.vue        # Layout com sidebar desktop + mobile
│   └── auth.vue           # Layout para páginas de login
├── middleware/
│   └── auth.global.ts     # Proteção de rotas client-side
├── pages/                 # Rotas baseadas em arquivo
│   ├── index.vue          # Dashboard
│   ├── login.vue          # Tela de login
│   ├── clientes.vue
│   ├── produtos.vue
│   ├── orcamentos/
│   ├── vendas/
│   ├── transacoes.vue
│   ├── agendamentos.vue
│   ├── mobile/            # Interface mobile otimizada
│   └── ...
├── plugins/
│   └── auth.ts            # Intercepta 401 no $fetch
├── types/                 # Definições TypeScript por domínio
└── utils/                 # Helpers e formatters
```

### 3.2 Backend (`server/`)

```
server/
├── api/                   # Endpoints H3 organizados por recurso
│   ├── auth/              # login.post.ts, logout.post.ts, mobile-login.post.ts
│   ├── companies/
│   ├── customers/
│   ├── products/
│   ├── quotes/[id]/       # download.get.ts, send-pdf.post.ts
│   ├── sales/[id]/        # bill.post.ts, download.get.ts, send-pdf.post.ts
│   ├── transactions/
│   ├── schedules/
│   ├── whatsapp/          # Integração com WhatsApp
│   └── setup-admin.get.ts # Endpoint de setup inicial
├── database/
│   ├── schema.ts          # Schema Drizzle completo (~900 linhas)
│   └── migrations/        # Arquivos SQL de migração
├── middleware/
│   └── auth.ts            # Validação de sessão para /api/*
├── types.d.ts             # Augmentação do H3EventContext
└── utils/
    ├── db.ts              # Cliente LibSQL com inicialização lazy
    ├── session.ts         # Gerenciamento de sessão + guards de autorização
    ├── schemas.ts         # Schemas Zod para validação
    ├── whatsapp.ts        # Integração com API Baileys/WhatsApp
    ├── pdf.ts             # Geração de PDFs com jsPDF
    ├── notifications.ts   # Sistema de notificações
    ├── rateLimit.ts       # Rate limiter em memória
    └── customer.ts        # Helpers de cliente
```

## 4. Arquitetura de Runtime

```
┌─────────────────┐
│   Cliente Nuxt  │
│   (Vue 3 + Nuxt)│
└────────┬────────┘
         │ $fetch
         ▼
┌─────────────────┐
│  Nitro Server   │
│  (H3)           │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────────────┐
│Middleware│ │ API Handlers│
│  auth.ts │ │  (Zod)      │
└────┬───┘ └──────┬──────┘
     │            │
     └────────────┘
            │
            ▼
     ┌─────────────┐
     │   Drizzle   │
     │    ORM      │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │  LibSQL/    │
     │  SQLite     │
     └─────────────┘
```

### 4.1 Fluxo de Requisição

1. Cliente chama `/api/*`
2. `server/middleware/auth.ts` valida sessão (exceto rotas públicas)
3. Handlers validam payload com Zod (`server/utils/schemas.ts`)
4. Operações no banco via Drizzle
5. Retorno JSON tipado

### 4.2 Autenticação

**Server-side (sessão):**
- Cookie `mc_session` (httpOnly, sameSite=lax, secure em produção)
- Sessão criptografada com `NUXT_SESSION_SECRET`
- Duração: 7 dias
- Injeta `event.context.auth` com `userId`, `authorizedCompanyIds`, `role`

**Client-side (estado):**
- Cookies: `mc_user`, `mc_companies`, `mc_active_company`
- Sincronização via `useState` para reatividade cross-tab
- Plugin `auth.ts` intercepta 401 e redireciona para login

### 4.3 Guards de Autorização

```typescript
// server/utils/session.ts
requireCompanyAccess(event, companyId)  // Verifica se user pode acessar empresa
requireAdmin(event)                      // Apenas role === 'admin'
requireManager(event)                    // Apenas admin ou manager
```

## 5. Banco de Dados

### 5.1 Schema (server/database/schema.ts)

**Tabelas principais:**

| Tabela | Descrição |
|--------|-----------|
| `companies` | Empresas tenant (concreteiras) |
| `users` | Usuários do sistema |
| `userCompanies` | Junção N:N usuário-empresa com role |
| `userAuth` | Credenciais (password hash, HWID) |
| `products` | Produtos (concreto, bomba, aditivos, etc.) |
| `quotes` | Orçamentos |
| `quoteItems` | Itens de orçamento |
| `sales` | Vendas/ordens de serviço |
| `saleItems` | Itens de venda |
| `sellers` | Vendedores com comissão |
| `drivers` | Motoristas |
| `pumpers` | Bombeadores |
| `paymentMethods` | Formas de pagamento |
| `transactions` | Transações financeiras |
| `schedules` | Agendamentos |
| `materials` | Insumos para traços |
| `mixDesigns` | Traços/receitas de concreto |
| `mixDesignItems` | Composição dos traços |
| `notifications` | Notificações internas |
| `whatsappSettings` | Configurações de WhatsApp |

### 5.2 Convenções de Valores Monetários

- **Sempre armazenados como inteiro em centavos** (`price`, `subtotal`, `total`, `amount`, `discount`)
- Conversão para exibição: `value / 100`
- Exemplo: R$ 350,00 = `35000`

### 5.3 Convenções de Data

- Armazenadas como timestamps Unix (inteiro)
- Função `parseDate()` em `server/utils/db.ts` normaliza datas para evitar problemas de timezone

### 5.4 Multi-tenancy

- Quase todas as tabelas têm `companyId` (chave estrangeira para `companies`)
- Acesso cruzado entre empresas é bloqueado por `requireCompanyAccess`

## 6. Comandos de Build e Desenvolvimento

### 6.1 Comandos Oficiais (Bun)

```bash
# Instalação
bun install

# Desenvolvimento
bun run dev              # Servidor dev em http://localhost:3000

# Build
bun run build            # Build de produção para .output/
bun run preview          # Preview local do build

# Qualidade de código
bun run lint             # ESLint
bun run typecheck        # TypeScript (vue-tsc)

# Banco de dados (Drizzle)
bun run db:generate      # Gerar migrações
bun run db:migrate       # Aplicar migrações
bun run db:push          # Sincronizar schema (dev only)
bun run db:studio        # Drizzle Studio UI
bun run db:deploy        # Alias para migrate (produção)
```

### 6.2 Scripts Utilitários

```bash
# Seed de dados
bun run scripts/seed.ts         # Dados iniciais (admin, empresa demo)
bun run scripts/seed-demo.ts    # Dados de demonstração

# Validações
bun run scripts/check-fk.ts     # Verificar integridade de FKs
bun run scripts/validate-rbac.ts # Validar controle de acesso

# Migrações específicas
bun run scripts/migrate-whatsapp.ts
```

### 6.3 Setup Inicial

1. Clone o repositório
2. `bun install`
3. Configure `.env` (opcional para dev):
   ```
   NUXT_SESSION_SECRET=qualquer-string-dev
   DB_FILE_NAME=file:local.db
   ```
4. `bun run db:push` (cria as tabelas)
5. Acesse `/api/setup-admin` para criar o usuário admin inicial
6. Login com: `admin@meuconcreto.com` / `123456`

## 7. Convenções de Desenvolvimento

### 7.1 Idioma

- **Código**: TypeScript em inglês
- **Mensagens de erro e UI**: Português brasileiro
- **Comentários**: Português brasileiro
- **Nomes de variáveis**: camelCase em inglês

### 7.2 Estilo de Código

- 2 espaços de indentação
- LF (Unix line endings)
- Sem ponto e vírgula opcional (padrão do ESLint do Nuxt)
- Aspas duplas para strings

### 7.3 Padrões de API

**Estrutura de arquivos:**
```
server/api/resource/
├── index.get.ts      # Listar todos
├── index.post.ts     # Criar
├── [id].get.ts       # Obter um
├── [id].put.ts       # Atualizar
├── [id].delete.ts    # Deletar
└── [id]/
    └── action.post.ts # Ações customizadas
```

**Padrão em handlers:**
```typescript
export default defineEventHandler(async (event) => {
  // 1. Validar entrada com Zod
  const result = schema.safeParse(body)
  if (!result.success) throw createError({ statusCode: 400, ... })
  
  // 2. Verificar autorização
  requireCompanyAccess(event, companyId)
  
  // 3. Executar operação
  // 4. Retornar resposta
})
```

### 7.4 Validação

- **Sempre use Zod** para validar entradas de API
- Schemas definidos em `server/utils/schemas.ts`
- Mensagens de erro em português
- Transformações automáticas (ex: remover máscara de CPF/CNPJ)

### 7.5 Transações

Use transações do Drizzle para operações compostas:
```typescript
await db.transaction(async (tx) => {
  const [sale] = await tx.insert(sales).values(...).returning()
  await tx.insert(saleItems).values(items.map(...))
})
```

### 7.6 Nuxt UI v4

- Componentes importados automaticamente
- Configuração em `app/app.config.ts`
- Tema primary: `emerald`, neutral: `zinc`
- Use `UButton`, `UInput`, `UCard`, `USlideover`, etc.

## 8. Testes

**Estado atual:** Não há suíte de testes automatizados configurada (Vitest/Playwright/Jest).

**Validação manual disponível:**
- `scripts/validate-rbac.ts` - Valida controle de acesso
- `scripts/check-fk.ts` - Verifica integridade referencial

## 9. Segurança

### 9.1 Pontos Críticos

| Aspecto | Implementação |
|---------|---------------|
| Senhas | bcryptjs com salt 10 |
| Sessão | Cookie httpOnly, sameSite=lax, secure em produção |
| Rate limiting | 10 tentativas / 15 min por IP (login) |
| Autorização | `requireCompanyAccess`, `requireAdmin`, `requireManager` |
| HWID | Opcional, para vinculação de dispositivo |

### 9.2 Variáveis de Ambiente Obrigatórias (Produção)

```bash
NUXT_SESSION_SECRET=<string-32-chars-min>
DB_FILE_NAME=file:/app/data/local.db
```

### 9.3 Endpoints Públicos (sem autenticação)

- `/api/auth/login`
- `/api/auth/mobile-login`
- `/api/auth/mobile-companies`
- `/api/setup-admin`

**Atenção:** O endpoint `/api/setup-admin` deve ser desabilitado ou protegido após o setup inicial em produção.

### 9.4 Cron Jobs e Autenticação

Os endpoints de WhatsApp para cron jobs estão sob o middleware de autenticação:
- `/api/whatsapp/process-reminders`
- `/api/whatsapp/process-reports`

Para uso em produção com Coolify ou similar, considere adicionar validação de token de cron:
```typescript
const auth = getHeader(event, "authorization");
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  throw createError({ statusCode: 401, message: "Não autorizado" });
}
```

## 10. Deploy

### 10.1 Docker

O `Dockerfile` é multi-stage:

1. **Stage build** (Bun Alpine):
   - Instala python3, make, g++ para compilar dependências nativas
   - Instala dependências com `bun install --frozen-lockfile`
   - Build do Nuxt: `bun run build`

2. **Stage runtime** (Bun Alpine):
   - Copia `.output/` do stage build
   - Reinstala dependências em `.output/server/` (necessário para binários @libsql)
   - Copia arquivos do Drizzle para migrations funcionarem
   - Comando: `bun ./.output/server/index.mjs`

### 10.2 Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data    # Persistência do SQLite
    environment:
      - NODE_ENV=production
      - DB_FILE_NAME=file:/app/data/local.db
      - NUXT_SESSION_SECRET=<secret>
```

### 10.3 Coolify

Veja `COOLIFY_CRON_SETUP.md` para configuração de tarefas agendadas:

**Lembretes de agendamento:**
- Schedule: `0 * * * *` (a cada hora)
- Comando: `curl -X GET http://localhost:3000/api/whatsapp/process-reminders`

**Relatórios automáticos:**
- Schedule: `0 8 * * *` (todos os dias às 08:00)
- Comando: `curl -X GET http://localhost:3000/api/whatsapp/process-reports`

### 10.4 Primeiro Deploy

1. Execute as migrações: `bun run db:deploy`
2. Acesse `/api/setup-admin` para criar usuário inicial
3. Configure WhatsApp se necessário
4. Configure cron jobs para notificações

## 11. Integração WhatsApp

### 11.1 Configuração

A integração usa a API Baileys (via instância externa configurável):

- Configuração por empresa em `whatsappSettings`
- Suporte a configuração global (uma instância para múltiplas empresas)
- Campos: `apiUrl`, `apiKey`, `phoneNumber` (instance name)

### 11.2 Funcionalidades

- Envio de PDFs de orçamentos/vendas
- Alertas automáticos (vendas, orçamentos, transações)
- Relatórios periódicos (diário/semanal/mensal)
- Lembretes de agendamento

### 11.3 Formato do Número

A função `formatJid()` normaliza números:
- Remove não-dígitos
- Adiciona código do país (55) se necessário
- Formata como: `+5511999999999@s.whatsapp.net`

## 12. Diretrizes para Agentes de IA

Ao alterar o projeto:

1. **Preserve o modelo multi-tenant** - sempre use `companyId` + `requireCompanyAccess`
2. **Mantenha validação Zod** em todos os handlers novos/alterados
3. **Valores monetários** - use centavos (inteiro), nunca float
4. **Migrações** - ao mudar schema, gere migração com `bun run db:generate`
5. **Organização** - mantenha coerência com a estrutura por domínio em `app/components` e `server/api`
6. **Idioma** - mensagens de erro em português, código em inglês
7. **Autorização** - verifique permissões adequadas (company/admin/manager)
8. **Transações** - use para operações que envolvem múltiplas tabelas
9. **Nuxt UI** - prefira componentes do @nuxt/ui para novas telas
10. **Tipagem** - mantenha TypeScript estrito, evite `any` quando possível
