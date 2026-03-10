# Configuração de Tarefas Agendadas (Cron) no Coolify

Para que os lembretes de WhatsApp sejam enviados automaticamente, é necessário configurar uma tarefa agendada (Cron) no Coolify para chamar periodicamente o endpoint de processamento.

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
  - _Se preferir a cada 30 minutos, use: `_/30 \* \* \* _`._
- **Command (Comando):**
  ```bash
  curl -X GET http://localhost:3000/api/whatsapp/process-reminders
  ```

  - _Nota: Substitua `3000` pela porta interna da sua aplicação Nuxt se ela for diferente._
  - _Se o Coolify estiver rodando a tarefa fora do container da aplicação, use a URL pública:_
  ```bash
  curl -X GET https://seu-dominio.com/api/whatsapp/process-reminders
  ```

### 5. Ativar e Salvar

- Salve a tarefa.
- Certifique-se de que a tarefa está marcada como **Enabled** (Ativada).

---

## 🔒 Dica de Segurança (Opcional mas Recomendado)

Como o endpoint `/api/whatsapp/process-reminders` pode disparar muitas mensagens e consumir créditos da API, você pode querer protegê-lo com um Token de Segurança.

1. No seu arquivo `.env`, adicione: `CRON_SECRET=um-token-secreto-aqui`.
2. No comando do Coolify, envie este token no cabeçalho:
   ```bash
   curl -H "Authorization: Bearer seu-token-secreto" http://localhost:3000/api/whatsapp/process-reminders
   ```
3. No arquivo `server/api/whatsapp/process-reminders.get.ts`, valide o token:
   ```typescript
   const auth = getHeader(event, "authorization");
   if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
     throw createError({ statusCode: 401, message: "Não autorizado" });
   }
   ```

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
  curl -X GET http://localhost:3000/api/whatsapp/process-reports
  ```

> **Pré-requisitos por empresa:** WhatsApp conectado + `Relatórios Habilitados` ativado nas configurações + ao menos um destinatário em *Destinatários do Relatório*.

---

## Monitoramento

Você pode ver os logs de execução na mesma aba de **Scheduled Tasks** para garantir que o endpoint está retornando `200 OK`.
