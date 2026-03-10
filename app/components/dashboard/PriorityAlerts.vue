<script setup lang="ts">
interface PriorityAlert {
  id: string;
  color: "error" | "warning" | "info" | "success";
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
}

defineProps<{
  alerts: PriorityAlert[];
}>();

const goToAlertAction = (to: string) => {
  navigateTo(to);
};
</script>

<template>
  <UCard
    class="rounded-3xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
    :ui="{
      header: 'px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800',
      body: 'p-4 sm:p-6',
    }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-2 h-6 bg-primary-500 rounded-full" />
        <h3
          class="font-black text-zinc-900 dark:text-white uppercase tracking-tight"
        >
          Alertas Prioritários
        </h3>
      </div>
    </template>

    <div class="space-y-3">
      <UAlert
        v-for="alert in alerts"
        :key="alert.id"
        :color="alert.color"
        variant="soft"
        :icon="alert.icon"
        :title="alert.title"
        :description="alert.description"
        :actions="[
          {
            label: alert.actionLabel,
            color: 'neutral',
            variant: 'ghost',
            onClick: () => goToAlertAction(alert.actionTo),
          },
        ]"
        class="rounded-2xl"
      />
    </div>
  </UCard>
</template>
