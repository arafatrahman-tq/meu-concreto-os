import type {
  Sale,
  Product,
  Company,
  PaymentMethod,
  Seller,
  Driver,
  Pumper,
  SaleStatus,
  MixDesign
} from '../types/sales'

export const useSales = () => {
  const { companyId } = useAuth()

  // ─────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────
  const {
    data: dashboardPayload,
    refresh: refreshSales,
    pending: loadingSales
  } = useAsyncData(
    `sales-dashboard-${companyId.value}`,
    async () => {
      if (!companyId.value) {
        return {
          sales: [],
          products: [],
          companies: [],
          paymentMethods: [],
          sellers: [],
          mixDesigns: []
        }
      }

      const [
        salesRes,
        productsRes,
        companiesRes,
        paymentMethodsRes,
        sellersRes,
        mixRes
      ] = await Promise.all([
        $fetch<{ sales: Sale[] }>('/api/sales', {
          query: { companyId: companyId.value }
        }),
        $fetch<{ products: Product[] }>('/api/products', {
          query: { companyId: companyId.value }
        }),
        $fetch<{ companies: Company[] }>('/api/companies', {
          query: { companyId: companyId.value }
        }),
        $fetch<{ paymentMethods: PaymentMethod[] }>('/api/payment-methods', {
          query: { companyId: companyId.value, active: true }
        }),
        $fetch<{ sellers: Seller[] }>('/api/sellers', {
          query: { companyId: companyId.value, active: true }
        }),
        $fetch<{ mixDesigns: MixDesign[] }>('/api/mix-designs', {
          query: { companyId: companyId.value }
        })
      ])

      return {
        sales: salesRes.sales || [],
        products: productsRes.products || [],
        companies: companiesRes.companies || [],
        paymentMethods: paymentMethodsRes.paymentMethods || [],
        sellers: sellersRes.sellers || [],
        mixDesigns: mixRes.mixDesigns || []
      }
    },
    { watch: [companyId] }
  )

  const {
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
    handleConfirmCreate
  } = useLogistics()

  // ─────────────────────────────────────────────
  // Computed Lists
  // ─────────────────────────────────────────────
  const sales = computed(() => dashboardPayload.value?.sales ?? [])
  const products = computed(() => dashboardPayload.value?.products ?? [])
  const companiesList = computed(() => dashboardPayload.value?.companies ?? [])
  const paymentMethods = computed(
    () => dashboardPayload.value?.paymentMethods ?? []
  )
  const sellersList = computed(() => dashboardPayload.value?.sellers ?? [])
  const mixDesigns = computed(() => dashboardPayload.value?.mixDesigns ?? [])

  // ─────────────────────────────────────────────
  // Known Customers (from companies + past sales)
  // ─────────────────────────────────────────────
  const { knownCustomers } = useKnownCustomers(companiesList, sales, 'sale')

  // ─────────────────────────────────────────────
  // Filters & Search
  // ─────────────────────────────────────────────
  const search = ref('')
  const statusFilter = ref<SaleStatus | 'all'>('all')
  const page = ref(1)
  const pageSize = ref(10)

  const filteredSales = computed(() => {
    return sales.value
      .filter((s) => {
        const matchState
          = statusFilter.value === 'all' || s.status === statusFilter.value
        const matchSearch
          = !search.value
            || s.customerName.toLowerCase().includes(search.value.toLowerCase())
            || String(s.id).includes(search.value)
            || (s.customerDocument ?? '').includes(search.value)
        return matchState && matchSearch
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  })

  const paginatedSales = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filteredSales.value.slice(start, start + pageSize.value)
  })

  const totalPages = computed(() =>
    Math.ceil(filteredSales.value.length / pageSize.value)
  )

  watch([search, statusFilter], () => {
    page.value = 1
  })

  // ─────────────────────────────────────────────
  // Summary Stats
  // ─────────────────────────────────────────────
  const stats = computed(() => {
    const all = sales.value
    return {
      total: all.length,
      inProgress: all.filter(
        s => s.status === 'confirmed' || s.status === 'in_progress'
      ).length,
      completed: all.filter(s => s.status === 'completed').length,
      totalValue: all
        .filter(
          s =>
            s.status === 'completed'
            || s.status === 'confirmed'
            || s.status === 'in_progress'
        )
        .reduce((sum, s) => sum + s.total, 0)
    }
  })

  // ─────────────────────────────────────────────
  // Actions State
  // ─────────────────────────────────────────────
  const isDeleteModalOpen = ref(false)
  const deleteTarget = ref<Sale | null>(null)
  const loadingDelete = ref(false)

  const billingDialog = ref(false)
  const billingSale = ref<Sale | null>(null)
  const billingForm = reactive({
    paymentMethod: undefined as string | undefined,
    status: 'paid' as 'paid' | 'pending'
  })

  const toast = useToast()

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────
  const openDeleteConfirm = (s: Sale) => {
    deleteTarget.value = s
    isDeleteModalOpen.value = true
  }

  const handleDelete = async () => {
    if (!deleteTarget.value) return
    loadingDelete.value = true
    try {
      await $fetch(`/api/sales/${deleteTarget.value.id}`, { method: 'DELETE' })
      toast.add({ title: 'Venda excluída com sucesso', color: 'success' })
      isDeleteModalOpen.value = false
      await refreshSales()
    } catch (e) {
      toast.add({
        title: 'Erro ao excluir venda',
        description: getApiError(e),
        color: 'error'
      })
    } finally {
      loadingDelete.value = false
    }
  }

  const updateStatus = async (s: Sale, next: SaleStatus) => {
    try {
      await $fetch(`/api/sales/${s.id}`, {
        method: 'PUT',
        body: { status: next }
      })
      toast.add({
        title: 'Status atualizado',
        description: `Venda #${String(s.id).padStart(
          4,
          '0'
        )} agora está ${next}`,
        color: 'success'
      })
      await refreshSales()
    } catch (e) {
      toast.add({
        title: 'Erro ao atualizar status',
        description: getApiError(e),
        color: 'error'
      })
    }
  }

  const openBilling = (s: Sale) => {
    billingSale.value = s
    billingForm.paymentMethod = s.paymentMethod || undefined
    billingForm.status = 'paid'
    billingDialog.value = true
  }

  // ─────────────────────────────────────────────
  // Cancel
  // ─────────────────────────────────────────────
  const isCancelModalOpen = ref(false)
  const cancelTarget = ref<Sale | null>(null)
  const cancelReason = ref('')
  const loadingCancel = ref(false)

  const openCancelConfirm = (s: Sale) => {
    cancelTarget.value = s
    cancelReason.value = ''
    isCancelModalOpen.value = true
  }

  const handleCancel = async () => {
    if (!cancelTarget.value) return
    loadingCancel.value = true
    try {
      await $fetch(`/api/sales/${cancelTarget.value.id}`, {
        method: 'PUT',
        body: {
          status: 'cancelled',
          ...(cancelReason.value.trim()
            ? { notes: cancelReason.value.trim() }
            : {})
        }
      })
      toast.add({
        title: 'Venda cancelada',
        description: `Venda #${String(cancelTarget.value.id).padStart(4, '0')} foi cancelada.`,
        color: 'warning',
        icon: 'i-heroicons-no-symbol'
      })
      isCancelModalOpen.value = false
      await refreshSales()
    } catch (e) {
      toast.add({
        title: 'Erro ao cancelar',
        description: getApiError(e),
        color: 'error'
      })
    } finally {
      loadingCancel.value = false
      cancelTarget.value = null
      cancelReason.value = ''
    }
  }

  const handleBill = async () => {
    if (!billingSale.value) return
    try {
      await $fetch(`/api/sales/${billingSale.value.id}/bill`, {
        method: 'POST',
        body: {
          paymentMethod: billingForm.paymentMethod,
          status: billingForm.status
        }
      })
      toast.add({ title: 'Venda faturada com sucesso', color: 'success' })
      billingDialog.value = false
      await refreshSales()
    } catch (e) {
      toast.add({
        title: 'Erro ao faturar venda',
        description: getApiError(e),
        color: 'error'
      })
    }
  }

  return {
    sales,
    products,
    companiesList,
    paymentMethods,
    sellersList,
    driversList,
    pumpersList,
    knownCustomers,
    loadingSales,
    refreshSales,
    refreshDrivers,
    refreshPumpers,
    search,
    statusFilter,
    page,
    pageSize,
    filteredSales,
    paginatedSales,
    totalPages,
    stats,
    // Actions State
    isDeleteModalOpen,
    deleteTarget,
    loadingDelete,
    billingDialog,
    billingSale,
    billingForm,
    isConfirmDeleteModalOpen,
    confirmDeleteData,
    isDeleting,
    isConfirmCreateModalOpen,
    confirmCreateData,
    isCreating,
    // Cancel
    isCancelModalOpen,
    cancelTarget,
    cancelReason,
    loadingCancel,
    openCancelConfirm,
    handleCancel,
    // Actions
    openDeleteConfirm,
    handleDelete,
    updateStatus,
    openBilling,
    handleBill,
    onDeleteDriver,
    onDeletePumper,
    handleConfirmDelete,
    onCreateDriver,
    onCreatePumper,
    handleConfirmCreate,
    mixDesigns
  }
}
