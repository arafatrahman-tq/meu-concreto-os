# Design System - Meu Concreto OS

> **ARQUITETURA DE UI/UIX OFICIAL DO PROJETO**
> 
> Este documento deve ser seguido RIGOROSAMENTE por todos os agentes de IA ao criar ou modificar qualquer interface no projeto.
> Baseado no padrão da página `transacoes.vue` e seus componentes, integrado com princípios fundamentais de UX/UI.

---

## 1. PRINCÍPIOS FUNDAMENTAIS DE UX/UI

### 1.1 8-Point Grid System (OBRIGATÓRIO)

Todos os espaçamentos devem seguir o sistema de grid de 8px:

| Token | Valor | Uso |
|-------|-------|-----|
| `space-y-6` | 24px | Espaçamento entre seções principais |
| `gap-6` | 24px | Grid de KPIs |
| `gap-4` | 16px | Espaçamento entre elementos relacionados |
| `gap-2` | 8px | Botões agrupados |
| `p-6` | 24px | Padding padrão de cards |
| `px-6 py-4` | 24px/16px | Células de tabela |
| `p-4` | 16px | Header/footer compactos |

**NUNCA use valores que não sejam múltiplos de 4 ou 8.**

### 1.2 Leis de UX Aplicadas

#### Fitts's Law (Alvos de Toque)
- **Desktop:** Botões de ação devem ter no mínimo `40px` (usamos `w-10 h-10` = 40px)
- **Mobile:** Alvos de toque mínimo de `44px` (usamos `h-12` para botões principais)
- **Espaçamento:** Sempre `gap-2` (8px) entre botões de ação

#### Miller's Law (Carga Cognitiva)
- **Tabelas:** Máximo 7 colunas visíveis simultaneamente
- **Formulários:** Máximo 5-7 campos por seção (usar separadores visuais)
- **KPIs:** Grid máximo de 4 colunas (`xl:grid-cols-4`)

#### Hick's Law (Tempo de Decisão)
- **Ações de linha:** Máximo 3 ações visíveis (Editar + Dropdown com mais opções)
- **Filtros:** Máximo 3-4 filtros simultâneos
- **Evite:** Menus com mais de 7 itens

#### Goal-Gradient Effect
- **Skeletons:** Sempre mostrar durante loading (feedback de progresso)
- **Estados vazios:** Incluir CTA claro para próxima ação
- **Formulários:** Indicar campos obrigatórios com `required`

### 1.3 Teoria das Cores (60-30-10)

| Porcentagem | Elemento | Cores no Projeto |
|-------------|----------|------------------|
| **60%** | Background/Base | `bg-white dark:bg-zinc-900` |
| **30%** | Superfícies/Cards | `bg-zinc-50 dark:bg-zinc-800`, bordas `zinc-200/60` |
| **10%** | Acento/CTA | `primary-500` (emerald), `green-500`, `red-500` |

#### Dark Mode Physics
- Backgrounds mais escuros (mais distantes)
- Cards/superfícies intermediárias
- Elementos interativos mais claros (mais próximos do usuário)
- **NUNCA use cores saturadas em dark mode**

### 1.4 Hierarquia Visual (Blockframing)

Organize elementos em blocos lógicos antes de espaçar:
```
┌─ Page Container (max-w-7xl) ─────────────────────────────┐
│  ┌─ Header ──────────────────────────────────────────┐   │
│  │  Título + Subtítulo          [Ação Principal]     │   │
│  └───────────────────────────────────────────────────┘   │
│                         gap-6 (24px)                     │
│  ┌─ KPIs ────────────────────────────────────────────┐   │
│  │  [KPI] [KPI] [KPI] [KPI]                          │   │
│  └───────────────────────────────────────────────────┘   │
│                         gap-6 (24px)                     │
│  ┌─ Table Card ──────────────────────────────────────┐   │
│  │  Header                                            │   │
│  │  ───────────────────────────────────────────────── │   │
│  │  Table                                            │   │
│  │  ───────────────────────────────────────────────── │   │
│  │  Footer                                           │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. ESTRUTURA DE PÁGINA

### 2.1 Container Principal
```vue
<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- Page Header -->
    <!-- KPI Strip -->
    <!-- Filter Bar (opcional) -->
    <!-- Table Card -->
    <!-- Drawer/Modal -->
  </div>
</template>
```

**Regras OBRIGATÓRIAS:**
- Sempre use `max-w-7xl mx-auto` para centralizar o conteúdo
- Espaçamento vertical: `space-y-6` (24px - 8-point grid)
- Padding responsivo: `p-6 lg:p-8`

### 2.2 Page Header
```vue
<div class="flex items-start justify-between gap-4">
  <div>
    <h1 class="text-2xl font-black text-zinc-900 dark:text-white">
      Título da Página
    </h1>
    <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
      Descrição/subtítulo claro e direto
    </p>
  </div>
  <div class="flex items-center gap-2">
    <!-- Botões de ação principal -->
    <UButton color="primary" icon="i-heroicons-plus" size="md">
      Novo Item
    </UButton>
  </div>
</div>
```

---

## 3. KPI CARDS (MÉTRICAS)

### 3.1 Estrutura (8-Point Grid)
```vue
<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
  <div
    v-for="(kpi, i) in kpiItems"
    :key="i"
    class="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-300"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-tight">
        {{ kpi.label }}
      </span>
      <div :class="[kpi.bg, 'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0']">
        <UIcon :name="kpi.icon" :class="['w-6 h-6', kpi.color]" />
      </div>
    </div>
    <p class="text-3xl font-black tabular-nums tracking-tighter" :class="kpi.color">
      {{ kpi.value }}
    </p>
    <div class="flex items-center gap-1.5 -mt-2">
      <div :class="[kpi.color, 'w-1.5 h-1.5 rounded-full animate-pulse']" />
      <p class="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
        {{ kpi.suffix }}
      </p>
    </div>
  </div>
</div>
```

### 3.2 Cores de KPI (60-30-10 Aplicado)
```typescript
// Sucesso/Positivo (10% acento)
{
  color: 'text-green-500',
  bg: 'bg-green-50 dark:bg-green-500/10',
  icon: 'i-heroicons-check-circle'
}

// Erro/Negativo (10% acento)
{
  color: 'text-red-500',
  bg: 'bg-red-50 dark:bg-red-500/10',
  icon: 'i-heroicons-x-circle'
}

// Alerta/Pendente (10% acento)
{
  color: 'text-amber-500',
  bg: 'bg-amber-50 dark:bg-amber-500/10',
  icon: 'i-heroicons-clock'
}

// Primário/Info (10% acento)
{
  color: 'text-primary-500',
  bg: 'bg-primary-50 dark:bg-primary-500/10',
  icon: 'i-heroicons-information-circle'
}
```

---

## 4. TABELA DE DADOS (UCard + Table)

### 4.1 UCard Configuration
```vue
<UCard
  :ui="{
    body: 'p-0 sm:p-0',
    header: 'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
    footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800'
  }"
  class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden"
>
```

### 4.2 Header do Card (F-Pattern)
```vue
<template #header>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <!-- Barra de destaque primária -->
      <div class="w-2 h-6 bg-primary-500 rounded-full" />
      <h3 class="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
        Título da Tabela
      </h3>
    </div>
    <!-- Contador de itens (alinhado à direita) -->
    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
      {{ items.length }} entradas
    </p>
  </div>
</template>
```

### 4.3 Estrutura da Tabela (F-Pattern + Hierarquia)
```vue
<div class="overflow-x-auto">
  <table class="w-full text-sm">
    <thead>
      <tr class="bg-zinc-50/50 dark:bg-zinc-800/20">
        <th class="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Coluna 1
        </th>
        <!-- ... outras colunas -->
        <th class="px-6 py-4" /> <!-- Coluna de ações sem título -->
      </tr>
    </thead>
    <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
      <tr
        v-for="item in items"
        :key="item.id"
        class="group hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-all duration-200"
      >
        <!-- Células -->
      </tr>
    </tbody>
  </table>
</div>
```

### 4.4 Padrões de Células (Dados à Esquerda, F-Pattern)

**Coluna Principal (Nome/Descrição):**
```vue
<td class="px-6 py-4">
  <div class="flex flex-col gap-1">
    <span class="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary-600 transition-colors">
      {{ item.name }}
    </span>
    <div class="flex items-center gap-2">
      <!-- Badge de categoria/tag -->
      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
        {{ item.category }}
      </span>
    </div>
  </div>
</td>
```

**Status Badge (Variant Subtle):**
```vue
<td class="px-4 py-4">
  <UBadge
    :color="statusConfig[item.status].color"
    variant="subtle"
    class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
  >
    {{ statusConfig[item.status].label }}
  </UBadge>
</td>
```

**Indicador Visual (Tipo/Cor):**
```vue
<td class="px-4 py-4">
  <div class="flex items-center gap-2">
    <div :class="[typeConfig[item.type].color === 'success' ? 'bg-green-500' : 'bg-red-500', 'w-1.5 h-1.5 rounded-full']" />
    <span class="text-xs font-bold text-zinc-600 dark:text-zinc-400">
      {{ typeConfig[item.type].label }}
    </span>
  </div>
</td>
```

**Valores Monetários (Dados em Destaque):**
```vue
<td class="px-4 py-4 text-right">
  <span
    class="font-black tabular-nums text-base tracking-tighter"
    :class="item.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
  >
    {{ formatCurrency(item.amount) }}
  </span>
</td>
```

**Data:**
```vue
<td class="px-4 py-4 hidden lg:table-cell">
  <div class="flex flex-col">
    <span class="text-xs font-bold text-zinc-600 dark:text-zinc-300">
      {{ formatDate(item.date) }}
    </span>
    <span v-if="item.dueDate" class="text-[10px] text-zinc-400 font-medium">
      Ven: {{ formatDate(item.dueDate) }}
    </span>
  </div>
</td>
```

### 4.5 Ações de Linha (Fitts's Law + Hick's Law)

**Padrão OBRIGATÓRIO:**
```vue
<td class="px-6 py-4 text-right">
  <div class="flex items-center justify-end gap-1 transition-all">
    <!-- Botão de Editar (Ação principal) -->
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-heroicons-pencil-square"
      size="md"
      class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
      @click="emit('edit', item)"
    />
    <!-- Dropdown de Mais Ações (minimiza escolhas visíveis) -->
    <UDropdownMenu
      :items="[
        [
          {
            label: 'Ativar',
            icon: 'i-heroicons-eye',
            onSelect: () => toggleActive(item)
          },
          {
            label: 'Desativar',
            icon: 'i-heroicons-eye-slash',
            onSelect: () => toggleActive(item)
          }
        ],
        [
          {
            label: 'Excluir Item',
            icon: 'i-heroicons-trash',
            color: 'error' as const,
            onSelect: () => emit('delete', item)
          }
        ]
      ]"
    >
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-ellipsis-vertical"
        size="md"
        class="rounded-xl w-10 h-10 flex items-center justify-center p-0"
      />
    </UDropdownMenu>
  </div>
</td>
```

**Por que este padrão?**
- **Fitts's Law:** Botões `w-10 h-10` (40px) são fáceis de clicar
- **Hick's Law:** Apenas 2 elementos visíveis (Editar + Mais), ações adicionais escondidas no dropdown
- **Jakob's Law:** Padrão familiar (ícone de lápis = editar, três pontos = mais ações)

### 4.6 Paginação (Footer)
```vue
<template v-if="totalPages > 1" #footer>
  <div class="flex items-center justify-between">
    <p class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
      Página {{ currentPage }} de {{ totalPages }}
    </p>
    <div class="flex items-center gap-2">
      <UButton
        color="neutral"
        variant="subtle"
        icon="i-heroicons-chevron-left"
        size="sm"
        class="rounded-xl"
        :disabled="currentPage === 1"
        @click="currentPage--"
      />
      <UButton
        color="neutral"
        variant="subtle"
        icon="i-heroicons-chevron-right"
        size="sm"
        class="rounded-xl"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      />
    </div>
  </div>
</template>
```

---

## 5. FORMULÁRIOS (Drawers)

### 5.1 USlideover Structure (Miller's Law: Máx 7 campos por seção)
```vue
<USlideover
  v-model:open="isOpen"
  :title="isEditing ? 'Editar Item' : 'Novo Item'"
  side="right"
  :ui="{ footer: 'p-0 block' }"
>
  <template #body>
    <div class="flex flex-col gap-6 p-6 overflow-y-auto h-full pb-24">
      <form id="item-form" class="flex flex-col gap-8" @submit.prevent="handleSave">
        <!-- Seções do formulário -->
      </form>
    </div>
  </template>
  
  <template #footer>
    <div class="flex items-center gap-4 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <UButton
        color="neutral"
        variant="ghost"
        class="flex-1 font-bold h-12 rounded-2xl"
        @click="isOpen = false"
      >
        Cancelar
      </UButton>
      <UButton
        color="primary"
        class="flex-1 font-bold h-12 rounded-2xl shadow-lg shadow-primary-500/20"
        :loading="loadingSave"
        icon="i-heroicons-check"
        type="submit"
        form="item-form"
        size="lg"
      >
        {{ isEditing ? "Salvar Alterações" : "Criar Item" }}
      </UButton>
    </div>
  </template>
</USlideover>
```

### 5.2 Seções de Formulário (Blockframing)
```vue
<!-- Seção Principal -->
<div class="space-y-4">
  <h4 class="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
    <UIcon name="i-lucide-receipt" class="w-4 h-4" />
    Geral
  </h4>
  <div class="grid grid-cols-1 gap-4">
    <!-- Campos (máx 5-7 por seção) -->
  </div>
</div>

<USeparator />

<!-- Seção Secundária (com background) -->
<div class="rounded-3xl bg-zinc-50 dark:bg-zinc-800/20 p-6 border border-zinc-200/50 dark:border-zinc-700/30 flex flex-col gap-6">
  <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
    <div class="w-1.5 h-1.5 rounded-full bg-primary-500" />
    Datas & Configurações
  </h4>
  <div class="grid grid-cols-1 gap-5">
    <!-- Campos -->
  </div>
</div>
```

### 5.3 Campos de Formulário
```vue
<!-- Input simples -->
<UFormField label="Descrição" required :error="formErrors.description">
  <UInput
    v-model="form.description"
    placeholder="Ex: Descrição do item"
    class="w-full"
    size="lg"
  />
</UFormField>

<!-- Grid de 2 colunas -->
<div class="grid grid-cols-2 gap-5">
  <UFormField label="Tipo" required>
    <USelect
      v-model="form.type"
      :items="[{ label: 'Opção 1', value: 'opt1' }]"
      class="w-full"
      size="lg"
    />
  </UFormField>
  <UFormField label="Valor (R$)" required :error="formErrors.amount">
    <UInput
      v-model.number="form.amount"
      type="number"
      step="0.01"
      placeholder="0.00"
      icon="i-lucide-circle-dollar-sign"
      class="w-full"
      size="lg"
    />
  </UFormField>
</div>

<!-- Select com busca (para listas longas - Hick's Law) -->
<UFormField label="Categoria" required :error="formErrors.category">
  <USelectMenu
    v-model="form.category"
    :items="categoryOptions"
    placeholder="Selecione..."
    class="w-full"
    size="lg"
  />
</UFormField>
```

---

## 6. MODAIS

### 6.1 Modal de Confirmação (Delete)
```vue
<UModal v-model:open="isDeleteModalOpen" title="Excluir Item">
  <template #body>
    <div class="px-6 py-4 space-y-4">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Tem certeza que deseja excluir
        <span class="font-bold text-zinc-900 dark:text-white">
          "{{ deleteTarget?.name }}"
        </span>?
      </p>
      
      <!-- Preview do item -->
      <div
        v-if="deleteTarget"
        class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-500/20">
            <UIcon name="i-heroicons-item" class="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p class="text-sm font-bold text-zinc-900 dark:text-white">
              {{ deleteTarget.name }}
            </p>
            <p class="text-xs text-zinc-400">
              {{ deleteTarget.email }}
            </p>
          </div>
        </div>
        <UBadge
          :color="statusConfig[deleteTarget.status].color"
          variant="subtle"
          size="sm"
          class="font-black uppercase tracking-widest text-[9px] rounded-full px-2.5 py-0.5"
        >
          {{ statusConfig[deleteTarget.status].label }}
        </UBadge>
      </div>
      
      <p class="text-xs text-zinc-400">
        Esta ação é irreversível.
      </p>
    </div>
  </template>
  
  <template #footer>
    <div class="flex justify-end gap-3 px-6 pb-4">
      <UButton
        color="neutral"
        variant="ghost"
        :disabled="loadingDelete"
        @click="isDeleteModalOpen = false"
      >
        Cancelar
      </UButton>
      <UButton
        color="error"
        variant="soft"
        icon="i-heroicons-trash"
        :loading="loadingDelete"
        @click="handleDelete"
      >
        Excluir
      </UButton>
    </div>
  </template>
</UModal>
```

### 6.2 Modal de Confirmação com Alerta
```vue
<UModal v-model:open="showConfirmDialog" title="Confirmar Alteração">
  <template #body>
    <div class="px-6 py-4 space-y-4">
      <p class="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Mensagem de confirmação com <span class="font-bold text-zinc-900 dark:text-white">destaque</span>.
      </p>
      <div class="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-4 border border-amber-200 dark:border-amber-500/20">
        <div class="flex items-center gap-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-500" />
          <p class="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
            Atenção
          </p>
        </div>
        <p class="text-xs text-amber-600 dark:text-amber-500 mt-2">
          Descrição do alerta ou consequência da ação.
        </p>
      </div>
    </div>
  </template>
  <template #footer>
    <div class="flex justify-end gap-3 px-6 pb-4">
      <UButton color="neutral" variant="ghost" @click="showConfirmDialog = false">
        Revisar
      </UButton>
      <UButton color="primary" icon="i-heroicons-check" :loading="loading" @click="handleConfirm">
        Confirmar e Salvar
      </UButton>
    </div>
  </template>
</UModal>
```

---

## 7. FILTROS E BARRA DE BUSCA (Hick's Law)

### 7.1 Estrutura de Filtros (Máx 3-4 filtros)
```vue
<UCard
  :ui="{ body: 'p-4 sm:p-6', header: 'hidden', footer: 'hidden' }"
  class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col lg:flex-row gap-4 items-end">
      <div class="flex-1 w-full">
        <UFormField label="Pesquisar">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass"
            placeholder="Buscar por nome, email..."
            class="w-full"
            size="lg"
          />
        </UFormField>
      </div>
      <div class="w-full lg:w-48">
        <UFormField label="Status">
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            value-attribute="value"
            class="w-full"
            size="lg"
          />
        </UFormField>
      </div>
      <div class="flex gap-2 w-full lg:w-auto">
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-heroicons-funnel"
          size="lg"
          class="flex-1 lg:flex-none justify-center"
          :active="isFiltered"
        >
          Filtros
        </UButton>
        <UButton
          v-if="isFiltered"
          color="error"
          variant="ghost"
          icon="i-heroicons-x-mark"
          size="lg"
          @click="clearFilters"
        >
          Limpar
        </UButton>
      </div>
    </div>
  </div>
</UCard>
```

---

## 8. ESTADOS VAZIOS (Goal-Gradient Effect)

**NUNCA deixe o usuário sem próxima ação:**

```vue
<div class="flex flex-col items-center justify-center py-16 px-4">
  <div class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
    <UIcon name="i-heroicons-inbox" class="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
  </div>
  <p class="text-sm font-bold text-zinc-900 dark:text-white">
    Nenhum item encontrado
  </p>
  <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">
    Descrição do estado vazio e próximos passos.
  </p>
  <UButton
    color="primary"
    icon="i-heroicons-plus"
    size="sm"
    class="mt-4"
    @click="openCreate"
  >
    Criar Primeiro Item
  </UButton>
</div>
```

---

## 9. SKELETONS E LOADING (Goal-Gradient Effect)

### 9.1 Loading de Tabela
```vue
<div class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
  <div v-for="i in 6" :key="i" class="px-6 py-4">
    <USkeleton class="h-12 rounded-xl" />
  </div>
</div>
```

### 9.2 Loading de KPI Cards
```vue
<template v-if="pending">
  <USkeleton v-for="i in 4" :key="i" class="h-28 rounded-3xl" />
</template>
```

---

## 10. PALETA DE CORES (60-30-10)

### 10.1 Cores Primárias (60% Base)
- **Background Principal:** `bg-white dark:bg-zinc-900`
- **Background Secundário:** `bg-zinc-50 dark:bg-zinc-800`
- **Text Principal:** `text-zinc-900 dark:text-white`
- **Text Secundário:** `text-zinc-500 dark:text-zinc-400`
- **Text Muted:** `text-zinc-400`

### 10.2 Cores de Superfície (30%)
- **Card Background:** `bg-white dark:bg-zinc-900`
- **Hover State:** `hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40`
- **Bordas:** `border-zinc-200/60 dark:border-zinc-800/60`
- **Dividers:** `divide-zinc-100 dark:divide-zinc-800/50`

### 10.3 Cores de Acento (10%)
- **Primary (Emerald):** `primary-500`
- **Sucesso:** `green-500` / `text-green-600 dark:text-green-400`
- **Erro:** `red-500` / `text-red-600 dark:text-red-400`
- **Alerta:** `amber-500` / `text-amber-600 dark:text-amber-400`
- **Info:** `blue-500`

### 10.4 Dark Mode Physics
```
┌─ Background (zinc-900) ─────────────────────────────┐
│  ┌─ Card (zinc-900 + border) ───────────────────┐   │
│  │  ┌─ Hover State (zinc-800/40) ───────────┐   │   │
│  │  │  ┌─ Interactive Elements ──────────┐   │   │   │
│  │  │  │  (mais claros = mais próximos) │   │   │   │
│  │  │  └────────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

**Regras Dark Mode:**
- Backgrounds são os elementos MAIS ESCUROS
- Cards são intermediários
- Elementos interativos são MAIS CLAROS
- **NUNCA use cores saturadas** (causam eye strain)

### 10.5 Sombras
- **Card padrão:** `shadow-sm`
- **Card hover:** `hover:shadow-md`
- **Botão primário:** `shadow-lg shadow-primary-500/20` (cor relacionada ao botão)
- **NUNCA use sombras coloridas em botões neutros/brancos**

---

## 11. TIPOGRAFIA

### 11.1 Hierarquia Visual

| Elemento | Classe | Tamanho | Uso |
|----------|--------|---------|-----|
| **Título Página** | `text-2xl font-black` | 24px | Cabeçalho da página |
| **Título Card** | `font-black uppercase tracking-tight` | inherit | Títulos de cards |
| **Título Seção** | `text-xs font-black uppercase tracking-widest` | 12px | Seções de formulário |
| **Label Compacta** | `text-[10px] font-black uppercase tracking-[0.2em]` | 10px | Headers de card, KPIs |
| **Valor Principal** | `text-3xl font-black tabular-nums tracking-tighter` | 30px | KPIs |
| **Valor Monetário** | `font-black tabular-nums text-base tracking-tighter` | 16px | Valores em tabelas |
| **Badge** | `text-[9px] font-black uppercase tracking-widest` | 9px | Status badges |
| **Body** | `text-sm` | 14px | Texto geral |
| **Label** | `text-xs font-bold` | 12px | Labels de form |
| **Muted** | `text-[11px] text-zinc-400` | 11px | Informações secundárias |

### 11.2 Alinhamento (F-Pattern)
- **Tabelas de dados:** Sempre alinhar à ESQUERDA
- **Valores monetários:** Alinhar à DIREITA
- **Ações:** Alinhar à DIREITA
- **Status:** Alinhar à ESQUERDA (próximo ao texto)

**NUNCA centralize tudo - use F-pattern para leitura natural.**

### 11.3 Ênfase
- **Dados > Labels:** Valores devem ser mais prominentes que labels
- **Primary > Secondary > Muted:** Hierarquia clara de informação
- **Use `tabular-nums` para números:** Alinhamento consistente

---

## 12. ESPAÇAMENTOS E SIZES (8-Point Grid)

### 12.1 Padding Patterns

| Elemento | Padding | Valor |
|----------|---------|-------|
| Page Container | `p-6 lg:p-8` | 24px / 32px |
| Card Body | `p-6` | 24px |
| Card Header/Footer | `p-4` | 16px |
| Table Header | `px-6 py-4` | 24px / 16px |
| Table Cell | `px-4 py-4` ou `px-6 py-4` | 16px / 24px |
| Form Section | `gap-8` | 32px |
| Form Fields | `gap-4` ou `gap-5` | 16px / 20px |
| Button Group | `gap-2` | 8px |

### 12.2 Border Radius

| Elemento | Radius | Classe |
|----------|--------|--------|
| Cards/Containers | 24px | `rounded-3xl` |
| KPI Cards | 24px | `rounded-3xl` |
| Buttons | 16px | `rounded-2xl` |
| Icon Containers | 16px | `rounded-2xl` |
| Badges | 9999px | `rounded-full` |
| Avatars | 9999px | `rounded-full` |
| Inputs | 16px | `rounded-2xl` (via config) |

### 12.3 Tamanhos de Elementos

| Elemento | Tamanho | Notas |
|----------|---------|-------|
| Botão de Ação | `w-10 h-10` | 40px (Fitts's Law) |
| Ícone de KPI | `w-11 h-11` | 44px |
| Avatar | `w-10 h-10` | 40px |
| Badge | `px-2.5 py-0.5` | Compacto |
| Barra de destaque | `w-2 h-6` | 8px x 24px |

---

## 13. ÍCONES

### 13.1 Conjunto Padrão

| Categoria | Ícones |
|-----------|--------|
| **Ações** | `i-heroicons-pencil-square`, `i-heroicons-trash`, `i-heroicons-plus` |
| **Navegação** | `i-heroicons-chevron-left`, `i-heroicons-chevron-right` |
| **Status** | `i-heroicons-check-circle`, `i-heroicons-x-circle`, `i-heroicons-clock` |
| **Busca** | `i-heroicons-magnifying-glass` |
| **Filtros** | `i-heroicons-funnel`, `i-heroicons-x-mark` |
| **Menu** | `i-heroicons-ellipsis-vertical` |
| **Export** | `i-heroicons-arrow-down-tray` |
| **Financeiro** | `i-heroicons-banknotes`, `i-heroicons-arrow-trending-up/down` |
| **Lucide** | `i-lucide-receipt`, `i-lucide-credit-card`, `i-lucide-circle-dollar-sign` |

### 13.2 Tamanhos de Ícones

| Contexto | Tamanho |
|----------|---------|
| KPI | `w-6 h-6` |
| Botões (size="md") | Padrão do UButton |
| Tabela Inline | `w-3.5 h-3.5` |
| Modal/Alerta | `w-5 h-5` |
| Seção de Form | `w-4 h-4` |

---

## 14. CHECKLIST DE IMPLEMENTAÇÃO

Antes de finalizar qualquer página/componente, verifique:

### 14.1 Estrutura
- [ ] Container usa `max-w-7xl mx-auto`?
- [ ] Espaçamentos seguem 8-point grid (`gap-6`, `p-6`, etc.)?
- [ ] UCard tem as configs `body: 'p-0 sm:p-0'`, `header/footer` com bordas?

### 14.2 Tabela
- [ ] Tabela tem `bg-zinc-50/50` no thead e `divide-y` no tbody?
- [ ] Header do card tem a barra lateral `w-2 h-6 bg-primary-500 rounded-full`?
- [ ] Dados estão alinhados à esquerda (F-pattern)?
- [ ] Valores monetários estão alinhados à direita?
- [ ] Ações usam o padrão "Editar + Dropdown" com botões `w-10 h-10 rounded-xl`?
- [ ] Badges usam `variant="subtle"` e `rounded-full`?

### 14.3 KPIs
- [ ] Grid usa `gap-6` (24px)?
- [ ] Labels usam `text-[10px]` com `tracking-[0.2em]`?
- [ ] Cards têm `hover:shadow-md`?

### 14.4 Formulários
- [ ] Drawers têm padding bottom `pb-24` no body?
- [ ] Botão primário no footer tem `shadow-lg shadow-primary-500/20`?
- [ ] Seções estão separadas visualmente (separador ou background)?
- [ ] Máximo 5-7 campos por seção (Miller's Law)?

### 14.5 UX/UI
- [ ] Estados vazios têm ícone, título, descrição e CTA?
- [ ] Skeletons estão implementados para loading?
- [ ] Todos os textos de label usam uppercase com tracking?
- [ ] Touch targets são pelo menos 40px (Fitts's Law)?
- [ ] Cores seguem 60-30-10?
- [ ] Dark mode respeita "physics" (backgrounds escuros, elementos claros)?

### 14.6 Qualidade
- [ ] Código foi lintado com `bun run lint`?
- [ ] Não há `any` types desnecessários?
- [ ] Props e emits estão tipados?

---

## 15. EXEMPLO COMPLETO DE PÁGINA

```vue
<script setup lang="ts">
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Itens | Meu Concreto' })

const { companyId } = useAuth()

// Data
const { data, pending, refresh } = await useFetch('/api/items', { query: { companyId } })
const items = computed(() => (data.value as { items: Item[] })?.items ?? [])

// Filters (Hick's Law: máx 3-4 filtros)
const search = ref('')
const statusFilter = ref('all')
const filteredItems = computed(() => { /* ... */ })

// Pagination
const page = ref(1)
const pageSize = ref(12)
const paginatedItems = computed(() => { /* ... */ })
const totalPages = computed(() => Math.ceil(filteredItems.value.length / pageSize.value))

// Drawer
const isDrawerOpen = ref(false)
const editingItem = ref<Item | null>(null)
const openCreate = () => { editingItem.value = null; isDrawerOpen.value = true }
const openEdit = (item: Item) => { editingItem.value = item; isDrawerOpen.value = true }

// Delete
const isDeleteModalOpen = ref(false)
const deleteTarget = ref<Item | null>(null)
const confirmDelete = (item: Item) => { deleteTarget.value = item; isDeleteModalOpen.value = true }
</script>

<template>
  <div class="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- Page Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-zinc-900 dark:text-white">Itens</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Gerencie os itens do sistema</p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" size="md" @click="openCreate">
        Novo Item
      </UButton>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      <!-- KPI Cards... -->
    </div>

    <!-- Table -->
    <UCard
      :ui="{ body: 'p-0 sm:p-0', header: 'p-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800', footer: 'p-4 border-t border-zinc-100 dark:border-zinc-800' }"
      class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-primary-500 rounded-full" />
            <h3 class="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
              Lista de Itens
            </h3>
          </div>
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            {{ items.length }} entradas
          </p>
        </div>
      </template>

      <!-- Skeleton Loading -->
      <div v-if="pending" class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        <div v-for="i in 6" :key="i" class="px-6 py-4">
          <USkeleton class="h-12 rounded-xl" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center py-16 px-4">
        <div class="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-inbox" class="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
        </div>
        <p class="text-sm font-bold text-zinc-900 dark:text-white">Nenhum item encontrado</p>
        <p class="text-xs text-zinc-400 mt-1 text-center max-w-xs">Cadastre itens para começar</p>
        <UButton color="primary" icon="i-heroicons-plus" size="sm" class="mt-4" @click="openCreate">
          Criar Primeiro Item
        </UButton>
      </div>

      <!-- Table content... -->

      <template v-if="totalPages > 1" #footer>
        <!-- Pagination... -->
      </template>
    </UCard>

    <!-- Drawer -->
    <ItemDrawer v-model:open="isDrawerOpen" :item="editingItem" @saved="refresh" />

    <!-- Delete Modal -->
    <UModal v-model:open="isDeleteModalOpen" title="Excluir Item">
      <!-- Modal content... -->
    </UModal>
  </div>
</template>
```

---

## REFERÊNCIAS

- **Base:** `transacoes.vue` e componentes relacionados
- **Princípios UX:** `ui-uix-agent.instructions.md`
- **8-Point Grid:** Sistema de espaçamento baseado em múltiplos de 8
- **60-30-10 Rule:** Teoria das cores aplicada
- **F-Pattern:** Padrão de leitura ocidental

**Última atualização:** 2026-03-09  
**Versão:** 2.0.0  
**Integração:** Design System + Princípios UX/UI
