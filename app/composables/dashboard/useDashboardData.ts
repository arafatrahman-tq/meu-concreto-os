import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Sale, Transaction, Quote, Product } from '~/types/dashboard'

export const useDashboardData = async (companyId: Ref<number | null>, fetchWindowStart: Ref<string | null>) => {
    const lastUpdated = ref(new Date())
    const isRefreshing = ref(false)
    let pollInterval: ReturnType<typeof setInterval> | null = null

    // Life-cycles DEVEM ser declarados antes de qualquer "await" em Vue 3
    onMounted(() => {
        pollInterval = setInterval(() => {
            refreshAll()
        }, 30_000)
    })

    onUnmounted(() => {
        if (pollInterval) clearInterval(pollInterval)
    })

    // Nuxt 3/4 Best Practice para Fetches Paralelos Dependentes
    const { data: dashboardData, pending, refresh } = await useAsyncData(
        `dashboard-data-${companyId.value}-${fetchWindowStart.value ?? 'all'}`,
        async () => {
            if (!companyId.value) return null;

            // Constroi as URLs reativamente
            const salesBase = `/api/sales?companyId=${companyId.value}&minimal=true`
            const txBase = `/api/transactions?companyId=${companyId.value}`
            const dateQuery = fetchWindowStart.value ? `&startDate=${fetchWindowStart.value}` : ''

            // Usa o $fetch (isento de reatividade SSR) dentro do useAsyncData
            const [salesRes, txRes, quotesRes, productsRes] = await Promise.all([
                $fetch<{ sales: Sale[] }>(`${salesBase}${dateQuery}`),
                $fetch<{ transactions: Transaction[] }>(`${txBase}${dateQuery}`),
                $fetch<{ quotes: Quote[] }>(`/api/quotes?companyId=${companyId.value}`),
                $fetch<{ products: Product[] }>(`/api/products?companyId=${companyId.value}`)
            ])

            return {
                sales: salesRes.sales || [],
                transactions: txRes.transactions || [],
                quotes: quotesRes.quotes || [],
                products: productsRes.products || []
            }
        },
        // Assiste mudanças nas referências e re-faz o fetch automaticamente
        { watch: [companyId, fetchWindowStart] }
    )

    // Propriedades Computadas baseadas no resultado seguro
    const sales = computed(() => dashboardData.value?.sales ?? [])
    const transactions = computed(() => dashboardData.value?.transactions ?? [])
    const quotes = computed(() => dashboardData.value?.quotes ?? [])
    const products = computed(() => dashboardData.value?.products ?? [])

    async function refreshAll() {
        if (isRefreshing.value) return
        isRefreshing.value = true
        try {
            // Um único refresh limpo gerencia tudo
            await refresh()
            lastUpdated.value = new Date()
        } finally {
            isRefreshing.value = false
        }
    }

    return {
        sales,
        transactions,
        quotes,
        products,
        pending,
        lastUpdated,
        isRefreshing,
        refreshAll
    }
}
