# Diretrizes de Design & Psicologia de UI/UX - Meu Concreto

Este documento define a linguagem visual e os princípios de design do sistema **Meu Concreto**, inspirados na estética "Squareblack" (Clean, High-Contrast, Conversion-Focused) adaptada para um ERP industrial.

## 1. Filosofia de Design: "Agressivamente Limpo"

O objetivo é unir **estética minimalista premium** com **psicologia de conversão/ação**. O sistema não deve ser apenas bonito; ele deve impulsionar o usuário a realizar tarefas (criar orçamentos, fechar vendas) com o mínimo de atrito.

### Pilares:

1.  **Clareza Radical:** Se não ajuda a vender ou produzir, remova.
2.  **Alto Contraste:** Fundo branco/cinza-claro com texto quase preto. Ações primárias em "Lime Green" (Verde Neon).
3.  **Tipografia como Interface:** O texto é o principal elemento visual. Títulos grandes, tracking apertado.
4.  **Redução de Atrito:** Menos cliques, fluxos lineares, opções claras.

---

## 2. Sistema Visual (Tokens)

### Cores

Baseado em alto contraste e acentos vibrantes para foco.

| Token             | Valor         | Uso                                       |
| :---------------- | :------------ | :---------------------------------------- |
| `bg-white`        | `#FFFFFF`     | Fundo de cards e áreas principais         |
| `bg-light`        | `#F7F7F7`     | Fundo da página (app background)          |
| `bg-black`        | `#1B1B1B`     | Elementos de destaque máximo, Sidebar     |
| `text-primary`    | `#1B1B1B`     | Títulos, Texto principal                  |
| `text-gray`       | `#8D8D8D`     | Legendas, Texto secundário                |
| `border-light`    | `#E1E1E1`     | Divisores sutis                           |
| **`accent-lime`** | **`#D3FF00`** | **CTAs Primários, Status Positivo, Foco** |

### Tipografia

Estilo suíço/moderno. No Nuxt UI, usaremos a fonte padrão (Inter/Sans) ajustada para simular a `TWK Lausanne`.

- **Títulos (Display):** `font-weight: 350` (Light/Book), `letter-spacing: -1.5px` a `-2px`.
- **Corpo:** `font-weight: 300` ou `400`, `letter-spacing: -0.3px`.
- **Tamanhos:**
  - Display: `text-4xl` a `text-6xl` (Mobile), `text-7xl` (Desktop).
  - Headline: `text-2xl` a `text-3xl`.
  - Body: `text-base` (16px) ou `text-sm` (14px).

### Espaçamento & Layout

- **Grid:** Base de 8px.
- **Padding:** Generoso. Cards com `p-6` ou `p-8` (24px/32px).
- **Border Radius:**
  - Botões: `rounded-lg` (10px).
  - Cards: `rounded-2xl` (20px).
  - Inputs: `rounded-lg`.

---

## 3. Componentes & Psicologia

### Componentes & Psicologia

### 1. Botões (CTAs) - "Gritar ou Sussurrar"

Os botões devem ter hierarquia clara baseada no impacto financeiro da ação.

- **Primário (Ação de Venda/Criação):**
  - **Visual:** `bg-[#D3FF00]` (Lime) com texto `text-black`.
  - **Formato:** `rounded-lg` (10px), `px-6 py-3`.
  - **Interação:** `hover:scale-105` (feedback tátil/físico), `transition-transform`.
  - **Conteúdo:** Ícone à direita (Seta) + Texto de Ação ("Novo Orçamento ->").
  - **Uso:** Criar Orçamento, Confirmar Pedido, Finalizar Carga.
- **Secundário (Navegação/Detalhes):**
  - **Visual:** Texto simples (`text-white` ou `text-black`) com `underline` sutil ou borda fina.
  - **Uso:** "Ver detalhes", "Voltar", "Editar".

### 2. Cards & Containers (Bento Grid)

O layout deve seguir o padrão "Bento Grid" (blocos de conteúdo modulares).

- **Estrutura:**
  - Fundo: `bg-white` (Light Mode) ou `bg-[#1B1B1B]` (Dark/Highlight Mode).
  - Borda: `border border-gray-100` (sutil) ou Sem borda com sombra difusa.
  - Padding: `p-6` ou `p-8` (Generoso).
- **Tipos de Card:**
  - **Card de Comparação (Antes/Depois):** Dividido ao meio. Esquerda: "O jeito antigo" (Cinza/Apagado). Direita: "Com Meu Concreto" (Brilhante/Lime/Negrito).
  - **Card de Status:** Número gigante (`text-6xl`) + Rótulo pequeno. Ex: "50m³" (Hoje).
  - **Card de Ação Rápida:** Ícone grande + Título + Botão. Ex: "Expedição Rápida".

### 3. Prova Social & Autoridade (Interna)

Em um ERP, a "prova social" é a **confirmação de sucesso** e a **segurança operacional**.

- **Humanização:** Use avatares dos usuários/vendedores responsáveis nas ações.
  - _Ex:_ Ao lado do botão "Aprovar", mostre a foto do gerente que vai aprovar.
- **Feedbacks de Sucesso:**
  - Use "Checkmarks" animados ou ícones de sucesso vibrantes.
  - Mensagens de confirmação devem ser afirmativas: "Carga liberada com sucesso" (não apenas "Salvo").

### 4. Tabelas de Preço / Listas de Itens

Inspirado na seção de Pricing do Squareblack:

- **Clareza:** Liste itens com ícones de check (`✓`) pretos ou verdes.
- **Destaque:** O valor total deve ser a maior fonte da linha (`text-xl` ou `text-2xl`).
- **Simplicidade:** Remova colunas desnecessárias. Foque no que importa: Produto, Qtd, Valor.

### 5. Seção de FAQ / Ajuda (Accordion)

Para reduzir suporte e dúvidas operacionais dentro do sistema.

- **Design:** Lista limpa, apenas perguntas visíveis.
- **Interação:** Clique expande a resposta instantaneamente.
- **Uso:** "Como cancelar uma nota?", "Como alterar o traço?".

---

## 4. Fluxo de UI/UX (A Jornada do Usuário)

O fluxo deve ser **linear e bloqueante de distrações**.

1.  **Hook (Dashboard):** Visão geral imediata. "O que eu preciso fazer agora?".
    - _Componente:_ Cards de Status + Lista de Tarefas Pendentes.
2.  **Ação (Formulário/Pedido):** Foco total. Remova sidebar se possível ou diminua o contraste dela.
    - _Componente:_ Formulário centralizado, inputs grandes.
3.  **Confirmação (Review):** Resumo claro antes do "Commit".
    - _Componente:_ Card de resumo com valores totais em destaque.
4.  **Sucesso (Feedback):** Tela de "Vitória".
    - _Componente:_ Ícone de sucesso animado + Botão para próxima ação ("Novo Pedido").

---

## 5. Copywriting & Tone of Voice

- **Direto e Confiante:** Sem "Por favor", sem "Talvez".
  - _Ruim:_ "Deseja salvar as alterações?"
  - _Bom:_ **"Salvar Pedido"**
- **Focado em Benefício/Receita:**
  - Use termos como "Faturar", "Lucro", "Meta".
- **Transparência:** Se houver um erro, diga exatamente o que é e como resolver.
  - _Ex:_ "Caminhão sem motorista vinculado. Selecione um motorista."

---

## 6. Implementação no Nuxt UI (Tailwind)

Para aplicar este estilo no projeto atual, estenda o `tailwind.config.ts`:

```ts
export default {
  theme: {
    extend: {
      colors: {
        sq: {
          // Squareblack palette
          black: "#1B1B1B",
          white: "#FFFFFF",
          light: "#F7F7F7",
          gray: "#8D8D8D",
          lime: "#D3FF00",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // Ajustar letter-spacing nas classes
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.02em",
      },
    },
  },
};
```

### Exemplos de Classes

- **Título H1:** `text-4xl md:text-6xl font-light tracking-tighter text-sq-black`
- **Botão Primário:** `bg-sq-lime text-sq-black hover:scale-105 transition-transform font-medium rounded-lg px-6 py-3`
- **Card:** `bg-white rounded-2xl p-8 border border-gray-100 shadow-sm`
