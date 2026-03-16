<script setup lang="ts">
/**
 * BaseFormField - Wrapper para UFormField com consistência
 * 
 * Aplica estilos consistentes e suporte a estados de erro
 */

const props = defineProps<{
  label: string
  required?: boolean
  error?: string
  help?: string
  size?: 'sm' | 'md' | 'lg'
}>()

const sizeClasses = {
  sm: '',
  md: '',
  lg: ''
}
</script>

<template>
  <UFormField
    :label="label"
    :required="required"
    :error="error"
    :help="help"
    class="w-full"
  >
    <slot />
  </UFormField>
</template>
