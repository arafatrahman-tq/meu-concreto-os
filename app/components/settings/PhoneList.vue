<script setup lang="ts">
import { maskPhone } from '~/utils/formatters'

const props = defineProps<{
  modelValue: string[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const add = () => {
  const newList = [...props.modelValue, '']
  emit('update:modelValue', newList)
}

const remove = (index: number) => {
  const newList = [...props.modelValue]
  newList.splice(index, 1)
  emit('update:modelValue', newList)
}

const update = (index: number, value: string) => {
  const newList = [...props.modelValue]
  const masked = maskPhone(value)

  // Só atualiza se mudou (evita loop se máscara não mudar nada)
  if (newList[index] !== masked) {
    newList[index] = masked
    emit('update:modelValue', newList)
  }
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(phone, i) in modelValue"
      :key="i"
      class="flex items-center gap-2"
    >
      <UInput
        :model-value="phone"
        icon="i-heroicons-phone"
        :placeholder="placeholder || '+55 (00) 00000-0000'"
        class="flex-1"
        size="lg"
        @update:model-value="(v) => update(i, v)"
      />
      <UButton
        color="error"
        variant="ghost"
        size="sm"
        icon="i-heroicons-trash"
        class="h-11 w-11"
        @click="remove(i)"
      />
    </div>
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-heroicons-plus"
      class="w-full h-11 justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
      @click="add"
    >
      Adicionar número
    </UButton>
  </div>
</template>
