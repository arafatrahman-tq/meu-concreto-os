# Configuração de Tarefas Agendadas (Cron) no Coolify

Para que os lembretes e relatórios de WhatsApp sejam enviados automaticamente, é necessário configurar tarefas agendadas (Cron) no Coolify para chamar periodicamente os endpoints de processamento.

## Erro comum no Coolify: `sh: curl: not found`

Se aparecer esse erro, o container da task não possui `curl` instalado (comum em imagens Alpine enxutas).

Use uma destas abordagens:

1. **Recomendado (sem alterar imagem):** usar `wget` no comando da task.
2. **Alternativa:** instalar `curl` no Dockerfile de runtime (`apk add --no-cache curl`).

## ⚠️ Importante: autenticação atual da API

No estado atual do projeto, o middleware `server/middleware/auth.ts` protege praticamente todas as rotas `/api/*`.

Isso significa que os endpoints abaixo **não funcionam em cron sem ajuste**:

- `/api/whatsapp/process-reminders`
- `/api/whatsapp/process-reports`

Para funcionar em produção de forma segura, recomende-se:

1. Liberar apenas esses 2 endpoints para acesso de cron (sem sessão de usuário).
2. Exigir `Authorization: Bearer <CRON_SECRET>` dentro dos handlers.

## Passo a Passo

### 1. Acessar o Painel do Coolify

- Abra o seu painel do Coolify.
- Vá para **Projects** (Projetos) e selecione o seu projeto.
- Clique no serviço (Resource) que contém sua aplicação Nuxt (ex: `meu-concreto`).

### 2. Navegar para Tarefas Agendadas

- No menu lateral do serviço, clique em **Scheduled Tasks** (ou **Tarefas Agendadas** se estiver em português).

### 3. Adicionar Nova Tarefa

- Clique no botão **Add New Task / Add** (Adicionar).

### 4. Configurar os Campos

Preencha as informações conforme abaixo:

- **Name (Nome):** `Processar Lembretes WhatsApp`
- **Schedule (Frequência):** `0 * * * *`
  - _Isso fará com que a tarefa rode a cada hora cheia (ex: 13:00, 14:00)._
  - _Se preferir a cada 30 minutos, use: `*/30 * * * *`._
- **Command (Comando):**

  ```bash
  wget -qO- --header="Authorization: Bearer seu-token-secreto" http://localhost:3000/api/whatsapp/process-reminders
  ```

  - _Nota: Substitua `3000` pela porta interna da sua aplicação Nuxt se ela for diferente._
  - _Se o Coolify estiver rodando a tarefa fora do container da aplicação, use a URL pública:_

  ```bash
  wget -qO- --header="Authorization: Bearer seu-token-secreto" https://seu-dominio.com/api/whatsapp/process-reminders
  ```

### 5. Ativar e Salvar

- Salve a tarefa.
- Certifique-se de que a tarefa está marcada como **Enabled** (Ativada).

---

## 🔒 Segurança (Recomendado)

Como os endpoints de cron podem disparar mensagens e consumir créditos da API, proteja-os com token.

1. No seu arquivo `.env`, adicione: `CRON_SECRET=um-token-secreto-aqui`.
1. No comando do Coolify, envie este token no cabeçalho:

```bash
wget -qO- --header="Authorization: Bearer seu-token-secreto" "http://localhost:3000/api/whatsapp/process-reminders"
```

1. No arquivo `server/api/whatsapp/process-reminders.get.ts`, valide o token:

```typescript
const auth = getHeader(event, "authorization");
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  throw createError({ statusCode: 401, message: "Não autorizado" });
}
```

1. Repita a mesma validação em `server/api/whatsapp/process-reports.get.ts`.
1. Libere somente essas rotas no middleware `server/middleware/auth.ts` (ou trate exceção por token no middleware).

---

## Tarefa 2 — Relatórios Automáticos WhatsApp

Para que os relatórios automáticos (diário / semanal / mensal) sejam enviados, adicione uma **segunda** tarefa agendada:

- **Name:** `Relatórios Automáticos WhatsApp`
- **Schedule:** `0 8 * * *`
  - _Roda todos os dias às 08:00. O endpoint decide internamente se envia conforme a frequência configurada por empresa:_
    - _`daily` → envia todo dia_
    - _`weekly` → envia apenas nas segundas-feiras_
    - _`monthly` → envia apenas no dia 1º do mês_
- **Command:**

  ```bash
  wget -qO- --header="Authorization: Bearer seu-token-secreto" http://localhost:3000/api/whatsapp/process-reports
  ```

> Se a task rodar fora do container da aplicação, use a URL pública no comando.
> **Pré-requisitos por empresa:** WhatsApp conectado + `Relatórios Habilitados` ativado nas configurações + ao menos um destinatário em _Destinatários do Relatório_.

---

## Monitoramento

Você pode ver os logs de execução na mesma aba de **Scheduled Tasks** para garantir que o endpoint está retornando `200 OK`.

## Opcional: manter comandos com curl

Se preferir continuar com `curl`, instale no runtime da imagem:

```dockerfile
RUN apk add --no-cache curl
```

No seu `Dockerfile`, adicione isso no stage `runtime` antes do `CMD`.
