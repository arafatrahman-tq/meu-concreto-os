<script setup lang="ts">
const props = defineProps<{
  companyId: number | null
}>()

const emit = defineEmits(['updated'])

const toast = useToast()

const {
  data: companyData,
  pending: loadingCompany,
  refresh: refreshCompany
} = await useFetch<{
  company: {
    pdfNotes?: string | null
  }
}>(() => `/api/companies/${props.companyId}`)

const companyRaw = computed(() => companyData.value?.company ?? null)

const pdfNotesForm = reactive({
  pdfNotes: ''
})

const companyErrors = reactive<Record<string, string>>({})

const clearErrors = () => {
  for (const key in companyErrors) delete companyErrors[key]
}

watch(
  companyRaw,
  (c) => {
    if (!c) return
    pdfNotesForm.pdfNotes = c.pdfNotes ?? ''
  },
  { immediate: true }
)

const validate = (): boolean => {
  clearErrors()
  // Validação opcional - campo pode ser vazio
  if (pdfNotesForm.pdfNotes && pdfNotesForm.pdfNotes.length > 5000) {
    companyErrors.pdfNotes = 'As observações não podem ultrapassar 5000 caracteres.'
    return false
  }
  return true
}

const loadingSave = ref(false)

const handleSave = async () => {
  if (!validate()) return

  loadingSave.value = true
  try {
    await $fetch(`/api/companies/${props.companyId}`, {
      method: 'PUT',
      body: {
        pdfNotes: pdfNotesForm.pdfNotes.trim() || null
      }
    })
    toast.add({
      title: 'Observações salvas',
      description: 'As observações do PDF foram atualizadas com sucesso.',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    await refreshCompany()
    emit('updated')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, message?: string }
    toast.add({
      title: 'Erro ao salvar',
      description: err?.data?.message ?? err?.message ?? 'Tente novamente.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
  } finally {
    loadingSave.value = false
  }
}

// Preview do conteúdo em HTML
const showPreview = ref(false)
</script>

<template>
  <UCard
    :ui="{
      header: 'px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
      body: 'p-4 sm:p-6'
    }"
    class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-2 h-6 bg-primary-500 rounded-full" />
        <div>
          <h2 class="font-black text-zinc-900 dark:text-white uppercase tracking-tight">
            Observações do PDF
          </h2>
          <p class="text-xs text-zinc-400 mt-0.5">
            Texto personalizado que aparece nos PDFs de orçamentos e vendas
          </p>
        </div>
      </div>
    </template>

    <div
      v-if="loadingCompany"
      class="space-y-4 p-1"
    >
      <USkeleton class="h-32 rounded-xl" />
    </div>

    <div
      v-else
      class="space-y-4"
    >
      <!-- Info alert -->
      <UAlert
        color="info"
        variant="soft"
        icon="i-heroicons-information-circle"
        description="Este texto será exibido na parte inferior dos PDFs de orçamentos e pedidos de venda. Você pode usar formatação básica como negrito, itálico e quebras de linha."
      />

      <!-- Editor -->
      <UFormField
        label="Observações / Termos e Condições"
        :error="companyErrors.pdfNotes"
      >
        <UTextarea
          v-model="pdfNotesForm.pdfNotes"
          placeholder="Ex:&#10;• Validade do orçamento: 30 dias&#10;• Condições de pagamento: 50% na assinatura, 50% na entrega&#10;• Frete não incluso&#10;• Sujeito à disponibilidade de agenda"
          :rows="6"
          :maxlength="5000"
          class="w-full"
          size="lg"
        />
        <template #hint>
          <span class="text-xs text-zinc-400">
            {{ pdfNotesForm.pdfNotes?.length || 0 }}/5000 caracteres
          </span>
        </template>
      </UFormField>

      <!-- Preview toggle -->
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          :icon="showPreview ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          @click="showPreview = !showPreview"
        >
          {{ showPreview ? 'Ocultar preview' : 'Ver preview' }}
        </UButton>
      </div>

      <!-- Preview -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="showPreview"
          class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
        >
          <p class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">
            Preview no PDF:
          </p>
          <div class="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono">
            {{ pdfNotesForm.pdfNotes || '(Sem observações)' }}
          </div>
        </div>
      </Transition>

      <!-- Save -->
      <div class="flex justify-end pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-check"
          :loading="loadingSave"
          class="h-12 rounded-2xl font-bold shadow-lg shadow-primary-500/20"
          @click="handleSave"
        >
          Salvar Observações
        </UButton>
      </div>
    </div>
  </UCard>
</template>
