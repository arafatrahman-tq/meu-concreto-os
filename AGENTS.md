# AGENTS.md - Guia do Projeto Meu Concreto

Este arquivo serve como um guia completo para agentes de IA entenderem a arquitetura, convenções e estrutura do projeto "Meu Concreto".

## 1. Visão Geral do Projeto

**Meu Concreto** é um sistema de gestão (ERP/OS) multi-tenant voltado para empresas de concreto. O sistema abrange desde a prospecção (orçamentos) até a entrega (vendas e agendamentos), passando pelo controle financeiro e integração com WhatsApp.

### Stack Tecnológico Principal

- **Framework Fullstack:** [Nuxt 4](https://nuxt.com/) (Vue 3 + Nitro)
- **Runtime & Package Manager:** [Bun](https://bun.sh/)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (via [@nuxt/ui](https://ui.nuxt.com/))
- **Banco de Dados:** SQLite ([LibSQL](https://github.com/tursodatabase/libsql)/Turso)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Validação:** [Zod](https://zod.dev/)
- **Geração de PDF:** jsPDF & jsPDF-AutoTable
- **Containerização:** Docker (Alpine-based para compatibilidade com LibSQL)

## 2. Estrutura de Diretórios e Arquitetura

O projeto segue a estrutura padrão do Nuxt 4, com separação entre `app/` (frontend) e `server/` (backend).

### Diretórios Principais

- **`app/`**: Frontend (Vue 3).

  - `components/`: Componentes UI reutilizáveis.
  - `pages/`: Rotas da aplicação (ex: `vendas/`, `orcamentos/`, `clientes.vue`).
  - `composables/`: Lógica de estado e regras de negócio (ex: `useAuth`, `useQuotes`).
  - `types/`: Definições de interfaces TypeScript para o domínio (ex: `sales.ts`, `products.ts`).
  - `utils/`: Funções utilitárias de formatação e constantes.
  - `middleware/`: Middlewares de rota (ex: `auth.global.ts`).
  - `plugins/`: Plugins do Nuxt (ex: `auth.ts`).

- **`server/`**: Backend (Nitro).

  - `api/`: Endpoints RESTful organizados por recurso.
    - `auth/`: Login, logout e acesso mobile.
    - `whatsapp/`: Integração para envio de relatórios e lembretes.
    - Recursos: `companies`, `customers`, `products`, `quotes`, `sales`, `transactions`, etc.
  - `database/`:
    - `schema.ts`: Definição centralizada do banco de dados.
    - `migrations/`: Histórico de alterações SQL.
  - `utils/`: Helpers do servidor para DB, PDF, WhatsApp e sessões.
  - `middleware/`: Middlewares do Nitro (ex: `auth.ts`).

- **`scripts/`**: Scripts de manutenção, como `seed.ts` e migrações manuais.
- **`.agent/`**: Configurações, habilidades e workflows para agentes de IA (Trae/Gemini).

## 3. Comandos Principais

O projeto utiliza **Bun** exclusivamente para execução e gestão.

- **Desenvolvimento:** `bun run dev`
- **Build de Produção:** `bun run build`
- **Linting:** `bun run lint`
- **Typecheck:** `bun run typecheck`
- **Banco de Dados:**
  - Gerar migração: `bun run db:generate`
  - Aplicar migração: `bun run db:migrate`
  - Sincronização direta (dev): `bun run db:push`
  - Visualizador (Studio): `bun run db:studio`

## 4. Convenções e Padrões

### Banco de Dados (Drizzle)

- O schema é multi-tenant: quase todas as tabelas possuem `companyId`.
- Valores monetários são armazenados como **inteiros (centavos)** para evitar problemas de ponto flutuante.
- Campos específicos de concreto (FCK, Slump, Stone Size) estão integrados nos produtos e itens de venda/orçamento.

### Backend (Server)

- Validação rigorosa com `zod` em todos os handlers de API.
- Autenticação baseada em sessão (via `server/utils/session.ts`) e `bcryptjs`.
- Integração com WhatsApp para automação de processos operacionais.

### Frontend (App)

- Uso intensivo do `@nuxt/ui` para consistência.
- Tipagem forte sincronizada com o backend via diretório `app/types/`.
- `composables` encapsulam toda a lógica de comunicação com a API.

## 5. Testes e Qualidade

- **Status atual:** O projeto **não possui** suíte de testes unitários ou de integração (Vitest/Playwright) configurada no momento.
- **CI/CD:** Existe um workflow de GitHub Actions (`.github/workflows/ci.yml`) que executa `lint` e `typecheck` em cada push. _Nota: O workflow atualmente utiliza pnpm, o que diverge do uso local de bun._

## 6. Segurança e Deployment

- **Variáveis de Ambiente:** Essenciais: `NUXT_SESSION_SECRET`, `DB_FILE_NAME`.
- **Docker:** O `Dockerfile` é multi-stage e utiliza Alpine Linux. É necessário atenção especial ao `@libsql` que requer binários nativos específicos para a arquitetura de runtime.
- **Produção:** O servidor Nitro roda via `bun ./.output/server/index.mjs`.

## 7. Informações Adicionais para Agentes

- O projeto utiliza o Nuxt 4, portanto, certifique-se de seguir os padrões da versão 4 (ex: diretório `app/` em vez de `src/` ou raiz).
- Ao adicionar novos campos ao banco de dados, sempre atualize `server/database/schema.ts` e execute `bun run db:generate`.
- Sempre prefira o uso do `@nuxt/ui` para novos componentes.
