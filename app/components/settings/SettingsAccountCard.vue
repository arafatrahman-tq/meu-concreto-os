<script setup lang="ts">
const props = defineProps<{
  user: any;
  companyName?: string;
  city?: string | null;
  state?: string | null;
}>();

const userInitials = computed(() => {
  const n = props.user?.name ?? "";
  const parts = n.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0] ?? "";
    const last = parts[parts.length - 1] ?? "";
    return (first.charAt(0) + last.charAt(0)).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
});

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    admin: "Administrador",
    manager: "Gerente",
    user: "Usuário",
  };
  return map[props.user?.role ?? "user"] ?? "Usuário";
});
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0"
        >
          <UIcon name="i-heroicons-user" class="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h2
            class="text-sm font-black uppercase tracking-widest text-zinc-400"
          >
            Conta
          </h2>
          <p class="text-xs text-zinc-400 mt-0.5">Informações de acesso</p>
        </div>
      </div>
    </template>

    <div class="flex flex-col items-center gap-4 py-2">
      <!-- Avatar -->
      <div
        class="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20"
      >
        <span class="text-xl font-black text-white tracking-tight">
          {{ userInitials }}
        </span>
      </div>
      <div class="text-center">
        <p class="text-sm font-bold text-zinc-900 dark:text-white">
          {{ user?.name }}
        </p>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {{ user?.email }}
        </p>
        <UBadge color="success" variant="soft" size="sm" class="mt-2">
          {{ roleLabel }}
        </UBadge>
      </div>

      <!-- Company info -->
      <div
        v-if="companyName"
        class="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700 px-4 py-3"
      >
        <p
          class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1"
        >
          Empresa Ativa
        </p>
        <p class="text-sm font-bold text-zinc-900 dark:text-white truncate">
          {{ companyName }}
        </p>
        <p v-if="city" class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {{ city }}{{ state ? `, ${state}` : "" }}
        </p>
      </div>
    </div>
  </UCard>
</template>
