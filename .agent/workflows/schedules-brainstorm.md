## 🧠 Brainstorm: Sistema de Agendamentos (Schedules)

### Contexto
Implementar um sistema de agendamento robusto para gerenciar entregas de concreto, serviços de bomba e visitas técnicas, com alertas automáticos via WhatsApp e interface Nuxt UI v4.

---

### Opção A: Lista/Calendário Híbrido
Uma visão dupla onde o usuário pode alternar entre uma tabela detalhada (para buscas e filtros) e um calendário mensal/semanal (para visualização de carga de trabalho).

✅ **Prós:**
- Versatilidade total para diferentes perfis de usuário.
- O calendário facilita a visualização de conflitos de horário.
- A lista permite ações em massa e filtros avançados.

❌ **Cons:**
- Maior complexidade no desenvolvimento do componente de calendário.

📊 **Esforço:** Alto

---

### Opção B: Kanban de Status (Quadro)
Visualização dos agendamentos em colunas baseadas no status: "Pendente", "Confirmado", "Em Trânsito", "Concluído".

✅ **Prós:**
- Excelente para acompanhamento em tempo real (operação).
- Interface intuitiva de arrastar e soltar (drag-and-drop).

❌ **Cons:**
- Difícil de visualizar horários específicos ou datas futuras distantes.
- Menos eficiente para grandes volumes de dados em uma única tela.

📊 **Esforço:** Médio

---

### Opção C: Timeline / Agenda Vertical
Foco total no cronograma diário, exibindo os agendamentos em uma linha do tempo vertical (estilo Google Calendar "Day View").

✅ **Prós:**
- Ideal para logística e despacho (ver exatamente quem está onde e quando).
- Minimiza erros de sobreposição de horários.

❌ **Cons:**
- Visão limitada a um dia ou poucos dias por vez.

📊 **Esforço:** Médio

---

## 💡 Recomendação

**Opção A** porque no setor de concreto a previsibilidade (calendário) é tão importante quanto a precisão dos dados (lista). Iniciaremos com uma **Lista Poderosa** (seguindo o [design-system.md](c:\Users\Mauro\Music\meu-concreto\.agent\design-system.md)) e suporte a um modal de calendário ou filtros de data persistentes.

---

## 🛠️ Plano de Implementação

1. **Schema**: Tabela `schedules` no Drizzle.
2. **Validations**: `scheduleSchema` no Zod.
3. **API**: `GET`, `POST`, `PUT`, `DELETE` em `server/api/schedules/`.
4. **WhatsApp**: Gancho no `POST/PUT` para enviar notificações via `server/utils/notifications.ts`.
5. **Frontend**: Nova página `pages/agendamentos.vue` com `UDataTable` e modais do Nuxt UI v4.
