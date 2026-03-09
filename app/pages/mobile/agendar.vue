<script setup lang="ts">
import { reactive, ref } from 'vue'

definePageMeta({ layout: "auth" }) // Centered layout
useSeoMeta({ title: "Novo Agendamento" })

const { user, companyId, clearUser } = useAuth()
const toast = useToast()

const form = reactive({
  title: "",
  customerName: "",
  customerPhone: "",
  date: new Date().toISOString().split("T")[0],
  startTime: "08:00",
  type: "concrete_delivery" as string,
  location: "",
})

// 1. Estado Reativo de Erros
const formErrors = reactive<Record<string, string>>({})

const clearErrors = () => {
  for (const key in formErrors) delete formErrors[key]
}

const loading = ref(false)

const types = [
  { label: "Entrega de Concreto", value: "concrete_delivery" },
  { label: "Serviço de Bomba", value: "pump_service" },
  { label: "Visita Técnica", value: "site_visit" },
  { label: "Outro", value: "other" },
]

const handleLogout = async () => {
  await $fetch("/api/auth/logout", { method: "POST" })
  clearUser()
  window.location.href = "/mobile"
}

// 2. Função de validação limpa
const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  if (!form.title || form.title.trim().length < 3) {
    formErrors.title = "A descrição deve ter pelo menos 3 caracteres."
    isValid = false
  }

  if (!form.customerName || form.customerName.trim().length < 2) {
    formErrors.customerName = "O nome do cliente é obrigatório."
    isValid = false
  }

  if (!form.date) {
    formErrors.date = "Selecione uma data."
    isValid = false
  }

  if (!form.startTime) {
    formErrors.startTime = "Selecione um horário."
    isValid = false
  }

  return isValid
}

const handleSchedule = async () => {
  if (!validateForm()) return // Campos inválidos ficam vermelhos automaticamente

  loading.value = true
  try {
    const fullDate = new Date(`${form.date}T${form.startTime}:00`).toISOString()

    await $fetch("/api/schedules", {
      method: "POST",
      body: {
        ...form,
        date: fullDate,
        companyId: companyId.value,
        userId: user.value?.id,
        status: "pending",
      },
    })

    toast.add({
      title: "Agendamento Criado!",
      description: "O serviço foi agendado com sucesso.",
      color: "success",
      icon: "i-heroicons-check-circle"
    })

    // Reset form
    form.title = ""
    form.customerName = ""
    form.customerPhone = ""
    form.location = ""
    clearErrors()
  } catch (e: any) {
    toast.add({
      title: "Erro no Agendamento",
      description: e.data?.message || "Não foi possível salvar o agendamento.",
      color: "error",
      icon: "i-heroicons-exclamation-triangle"
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-lg mx-auto pb-10">
    <!-- Mobile Header -->
    <div class="flex items-center justify-between px-2 pt-2">
      <AppLogo :square="true" class="w-8 h-8" />
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-heroicons-arrow-left-on-rectangle"
        size="sm"
        class="rounded-full"
        @click="handleLogout"
      />
    </div>

    <!-- Main Card -->
    <div class="bg-white dark:bg-zinc-900 shadow-2xl shadow-zinc-200/50 dark:shadow-none rounded-4xl p-6 border border-zinc-100 dark:border-zinc-800 space-y-6">
      
      <UFormField 
        label="Descrição do Serviço" 
        required
        :error="formErrors.title"
      >
        <UInput
          v-model="form.title"
          placeholder="Ex: João - 15m³ / Laje 2"
          size="lg"
          icon="i-heroicons-pencil-square"
          class="w-full"
          :ui="{ base: 'h-12' }"
        />
      </UFormField>

      <div class="grid grid-cols-2 gap-4">
        <UFormField 
          label="Data" 
          required
          :error="formErrors.date"
        >
          <UInput
            v-model="form.date"
            type="date"
            size="lg"
            class="w-full"
            :ui="{ base: 'h-12' }"
          />
        </UFormField>

        <UFormField 
          label="Horário" 
          required
          :error="formErrors.startTime"
        >
          <UInput
            v-model="form.startTime"
            type="time"
            size="lg"
            class="w-full"
            :ui="{ base: 'h-12' }"
          />
        </UFormField>
      </div>

      <div class="space-y-4 pt-4 border-t border-zinc-50 dark:border-zinc-800">
        <UFormField 
          label="Cliente" 
          required
          :error="formErrors.customerName"
        >
          <UInput
            v-model="form.customerName"
            placeholder="Nome do Cliente"
            size="lg"
            icon="i-heroicons-user"
            class="w-full"
            :ui="{ base: 'h-12' }"
          />
        </UFormField>

        <UFormField label="WhatsApp do Cliente">
          <UInput
            v-model="form.customerPhone"
            placeholder="(00) 00000-0000"
            size="lg"
            icon="i-heroicons-phone"
            class="w-full"
            inputmode="tel"
            :ui="{ base: 'h-12' }"
          />
        </UFormField>
      </div>

      <UFormField label="Tipo de Serviço">
        <USelectMenu
          v-model="form.type"
          :items="types"
          value-key="value"
          label-key="label"
          size="lg"
          class="w-full"
          icon="i-heroicons-tag"
          :ui="{ base: 'h-12' }"
        />
      </UFormField>

      <UFormField label="Endereço da Obra">
        <UTextarea
          v-model="form.location"
          placeholder="Rua, número, bairro..."
          size="lg"
          :rows="3"
          class="w-full"
        />
      </UFormField>

      <div class="pt-4">
        <UButton
          block
          size="xl"
          color="primary"
          label="Confirmar Agendamento"
          icon="i-heroicons-check-circle"
          class="rounded-2xl h-16 font-bold text-lg shadow-xl shadow-primary-500/30 transition-all active:scale-[0.98]"
          :loading="loading"
          @click="handleSchedule"
        />
      </div>
    </div>
  </div>
</template>
