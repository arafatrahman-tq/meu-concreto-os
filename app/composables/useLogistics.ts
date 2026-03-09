import type { Driver, Pumper } from "../types/sales";

export const useLogistics = () => {
  const { companyId } = useAuth();
  const toast = useToast();

  const { data: driversData, refresh: refreshDrivers } = useAsyncData(
    `drivers-${companyId.value}`,
    async () => {
      if (!companyId.value) return { drivers: [] };
      return $fetch<{ drivers: Driver[] }>("/api/drivers", {
        query: { companyId: companyId.value, active: true },
      });
    },
    {
      watch: [companyId],
      default: () => ({ drivers: [] }),
    }
  );

  const { data: pumpersData, refresh: refreshPumpers } = useAsyncData(
    `pumpers-${companyId.value}`,
    async () => {
      if (!companyId.value) return { pumpers: [] };
      return $fetch<{ pumpers: Pumper[] }>("/api/pumpers", {
        query: { companyId: companyId.value, active: true },
      });
    },
    {
      watch: [companyId],
      default: () => ({ pumpers: [] }),
    }
  );

  const driversList = computed(() => driversData.value?.drivers ?? []);
  const pumpersList = computed(() => pumpersData.value?.pumpers ?? []);

  const driverOptions = computed(() => [
    { label: "Nenhum selecionado", value: null },
    ...driversList.value.map((d) => ({ label: d.name, value: d.id })),
  ]);

  const pumperOptions = computed(() => [
    { label: "Nenhum selecionado", value: null },
    ...pumpersList.value.map((p) => ({ label: p.name, value: p.id })),
  ]);

  const isConfirmDeleteModalOpen = ref(false);
  const confirmDeleteData = ref<{
    id: number;
    name: string;
    type: "driver" | "pumper";
  }>({ id: 0, name: "", type: "driver" });
  const isDeleting = ref(false);

  const isConfirmCreateModalOpen = ref(false);
  const confirmCreateData = ref<{
    name: string;
    type: "driver" | "pumper";
  }>({ name: "", type: "driver" });
  const isCreating = ref(false);

  const onDeleteDriver = (driver: { id: number; name: string }) => {
    confirmDeleteData.value = {
      id: driver.id,
      name: driver.name,
      type: "driver",
    };
    isConfirmDeleteModalOpen.value = true;
  };

  const onDeletePumper = (pumper: { id: number; name: string }) => {
    confirmDeleteData.value = {
      id: pumper.id,
      name: pumper.name,
      type: "pumper",
    };
    isConfirmDeleteModalOpen.value = true;
  };

  const handleConfirmDelete = async (currentForm?: any) => {
    isDeleting.value = true;
    try {
      const endpoint =
        confirmDeleteData.value.type === "driver"
          ? `/api/drivers/${confirmDeleteData.value.id}`
          : `/api/pumpers/${confirmDeleteData.value.id}`;

      await $fetch(endpoint, { method: "DELETE" });

      if (confirmDeleteData.value.type === "driver") {
        await refreshDrivers();
        if (currentForm && currentForm.driverId === confirmDeleteData.value.id)
          currentForm.driverId = null;
      } else {
        await refreshPumpers();
        if (currentForm && currentForm.pumperId === confirmDeleteData.value.id)
          currentForm.pumperId = null;
      }

      toast.add({
        title: `${
          confirmDeleteData.value.type === "driver" ? "Motorista" : "Bombeador"
        } excluído com sucesso`,
        color: "success",
      });
      isConfirmDeleteModalOpen.value = false;
    } catch (e) {
      toast.add({
        title: `Erro ao excluir ${
          confirmDeleteData.value.type === "driver" ? "motorista" : "bombeador"
        }`,
        description: getApiError(e),
        color: "error",
      });
    } finally {
      isDeleting.value = false;
    }
  };

  const onCreateDriver = (name: string) => {
    if (!name?.trim()) return;
    confirmCreateData.value = { name, type: "driver" };
    isConfirmCreateModalOpen.value = true;
  };

  const onCreatePumper = (name: string) => {
    if (!name?.trim()) return;
    confirmCreateData.value = { name, type: "pumper" };
    isConfirmCreateModalOpen.value = true;
  };

  const handleConfirmCreate = async (currentForm?: any) => {
    isCreating.value = true;
    try {
      const type = confirmCreateData.value.type;
      const endpoint = type === "driver" ? "/api/drivers" : "/api/pumpers";
      const data = await $fetch<any>(endpoint, {
        method: "POST",
        body: {
          name: confirmCreateData.value.name,
          companyId: companyId.value,
        },
      });

      if (type === "driver") {
        await refreshDrivers();
        if (currentForm) currentForm.driverId = data.driver.id;
      } else {
        await refreshPumpers();
        if (currentForm) currentForm.pumperId = data.pumper.id;
      }

      toast.add({
        title: `${
          type === "driver" ? "Motorista" : "Bombeador"
        } criado com sucesso`,
        color: "success",
      });
      isConfirmCreateModalOpen.value = false;
    } catch (e) {
      toast.add({
        title: `Erro ao criar ${
          confirmCreateData.value.type === "driver" ? "motorista" : "bombeador"
        }`,
        description: getApiError(e),
        color: "error",
      });
    } finally {
      isCreating.value = false;
    }
  };

  return {
    driversList,
    pumpersList,
    driverOptions,
    pumperOptions,
    refreshDrivers,
    refreshPumpers,
    isConfirmDeleteModalOpen,
    confirmDeleteData,
    isDeleting,
    isConfirmCreateModalOpen,
    confirmCreateData,
    isCreating,
    onDeleteDriver,
    onDeletePumper,
    handleConfirmDelete,
    onCreateDriver,
    onCreatePumper,
    handleConfirmCreate,
  };
};
