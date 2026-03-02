# UX/UI Psychology Agent Template (The "Psycho-Aesthetic" Algorithm)

Este documento atua como um **Algoritmo Mestre** para gerar sistemas de design focados em conversão e estética para qualquer projeto de software. Ele abstrai os princípios utilizados no "Meu Concreto" (inspirado na Squareblack) para um modelo reutilizável.

## Como Executar este Algoritmo

1.  **Defina as Variáveis de Entrada** (Seção 1).
2.  **Aplique as Regras de Transformação** (Seção 2 e 3).
3.  **Gere os Artefatos de Saída** (Seção 4 e 5).

---

## 1. Variáveis de Entrada (Contexto do Projeto)

Preencha estes dados para calibrar o agente:

*   **Nome do Projeto:** `[Insira o Nome]`
*   **Público Alvo:** `[Quem vai usar? Ex: Engenheiros, Adolescentes, Idosos]`
*   **Objetivo Primário (Ação):** `[O que o usuário DEVE fazer? Ex: Comprar, Ler, Produzir, Aprovar]`
*   **Arquétipo Estético:** `[Ex: Minimalismo Suíço, Cyberpunk, Corporativo Sóbrio, Playful]`
*   **Emoção Central:** `[Ex: Urgência, Confiança, Diversão, Calma]`

---

## 2. Regras de Transformação (Os 4 Pilares)

O agente deve aplicar estas regras rígidas ao criar o design:

### Regra 1: Clareza Radical (O Filtro)
*   *Algoritmo:* Se um elemento não contribui diretamente para o **Objetivo Primário**, ele deve ser:
    1.  Removido;
    2.  Escondido em um menu secundário;
    3.  Reduzido em opacidade (30-50%).

### Regra 2: Hierarquia de Contraste (O Foco)
*   *Algoritmo:* Apenas **1 elemento por tela** pode ter a cor de destaque máxima (Accent Color).
*   *Distribuição:*
    *   60% Fundo (Neutro)
    *   30% Conteúdo (Contraste Médio)
    *   10% Ação (Contraste Máximo / Cor Vibrante)

### Regra 3: Tipografia como Interface (A Voz)
*   *Algoritmo:* Títulos não são apenas rótulos, são comandos.
*   *Ajuste:* Use `letter-spacing` negativo (`-0.02em` a `-0.05em`) para fontes Sans-Serif grandes para criar sensação de "Premium/Moderno".

### Regra 4: Redução de Atrito (O Fluxo)
*   *Algoritmo:* Conte o número de cliques para a **Ação Primária**. Tente reduzir pela metade.
*   *Tática:* Use "Defaults Inteligentes" (pré-selecionar a opção mais provável).

---

## 3. Sistema Visual (Tokens Abstratos)

O agente deve gerar uma paleta baseada na **Emoção Central**.

| Token Abstrato | Função | Exemplo (Meu Concreto) | Seu Projeto |
| :--- | :--- | :--- | :--- |
| `color-canvas` | Fundo da aplicação | `#F7F7F7` (Off-White) | `...` |
| `color-surface` | Fundo de cards/blocos | `#FFFFFF` (White) | `...` |
| `color-ink-strong` | Textos principais | `#1B1B1B` (Off-Black) | `...` |
| `color-ink-weak` | Textos secundários | `#8D8D8D` (Gray) | `...` |
| **`color-accent`** | **Ação / O "Grito"** | **`#D3FF00` (Lime)** | `...` |
| `font-display` | Personalidade | `Inter (Tight Tracking)` | `...` |
| `radius-md` | Suavidade | `10px` (Botões) | `...` |

---

## 4. Componentes Psicológicos (Templates)

Copie e adapte estes componentes para o novo projeto.

### Componente A: O Botão de "Gritar"
*   **Objetivo:** Atrair o clique inevitável.
*   **Estilo:** `bg-[color-accent] text-[color-ink-strong] font-bold hover:scale-105 transition-all`.
*   **Conteúdo:** Verbo de Ação + Ícone de Direção (`->`).
*   **Exemplo:** "Finalizar Compra ->" ou "Publicar Agora ->".

### Componente B: O Card Bento (Unidade de Informação)
*   **Objetivo:** Organizar dados complexos em pedaços digeríveis.
*   **Estilo:** `bg-[color-surface] p-6 rounded-[radius-lg] border border-transparent hover:border-[color-ink-weak]/20`.
*   **Estrutura:**
    1.  Cabeçalho (Ícone + Título Pequeno).
    2.  Corpo (Dado Principal Grande).
    3.  Rodapé (Ação Secundária ou Link).

### Componente C: O Feedback de Dopamina
*   **Objetivo:** Recompensar o usuário por completar tarefas.
*   **Mecanismo:** Ao finalizar uma ação, não mostre apenas "Salvo".
*   **Template:** Modal/Toast com: Ícone Animado (Check/Confetti) + Mensagem de Reforço Positivo ("Excelente trabalho!").

---

## 5. Script de Implementação (Tailwind Generator)

Use este template para gerar a configuração técnica:

```ts
// tailwind.config.ts Template
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          base: 'var(--color-canvas)',    // Cor de Fundo
          surface: 'var(--color-surface)', // Cor de Cards
          primary: 'var(--color-ink-strong)', // Texto Principal
          muted: 'var(--color-ink-weak)',  // Texto Secundário
          accent: 'var(--color-accent)',   // AÇÃO PRINCIPAL
        }
      },
      fontFamily: {
        sans: ['[Sua Fonte]', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.05em',
        tighter: '-0.025em',
      }
    }
  }
}
```

---

## 6. Exemplo de Execução (Simulação)

**Entrada:**
*   Projeto: "ZenFocus" (App de Meditação).
*   Emoção: Calma Profunda.

**Processamento do Algoritmo:**
1.  **Cores:** `color-canvas` = `#E6E6FA` (Lavanda Suave), `color-accent` = `#4B0082` (Índigo Profundo - Ação suave, mas firme).
2.  **Tipografia:** Serifada elegante (Playfair Display).
3.  **Botão:** "Iniciar Sessão" (Índigo com texto branco, bordas arredondadas `rounded-full`).
4.  **Feedback:** Ao terminar meditação -> Som suave de sino + "Mente Serena Alcançada".

**Saída:** Um sistema visual que induz calma, mas converte o usuário para a prática diária.
