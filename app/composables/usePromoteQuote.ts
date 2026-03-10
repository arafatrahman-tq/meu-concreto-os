import { ref } from 'vue'
import { formatISO } from 'date-fns'
import type { Quote, QuoteStatus, QuoteItem } from '~/types/sales'

// Opcional: interface para os parâmetros do composable
export interface PromoteQuoteOptions {
  onSuccess?: () => void | Promise<void>
}

export const usePromoteQuote = (options?: PromoteQuoteOptions) => {
  const toast = useToast()

  const isPromoteModalOpen = ref(false)
  const promoteTarget = ref<Quote | null>(null)
  const isPromoting = ref(false)

  const promoteToSale = async (billNow: boolean) => {
    if (!promoteTarget.value || isPromoting.value) return

    isPromoting.value = true
    try {
      const q = promoteTarget.value

      // 1. Prepare data for sale creation
      const saleData = {
        companyId: q.companyId,
        quoteId: q.id,
        sellerId: q.sellerId || null,
        customerName: q.customerName,
        customerDocument: q.customerDocument ?? null,
        customerPhone: q.customerPhone ?? null,
        customerAddress: q.customerAddress ?? null,
        driverId: q.driverId || null,
        pumperId: q.pumperId || null,
        discount: q.discount || 0,
        status: 'pending',
        date: formatISO(new Date(), { representation: 'date' }),
        items: q.items.map((it: QuoteItem) => ({
          productId: it.productId ?? null,
          productName: it.productName,
          description: it.description ?? null,
          unit: it.unit ?? null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          fck: it.fck ?? null,
          slump: it.slump ?? null,
          stoneSize: it.stoneSize ?? null,
          mixDesignId: it.mixDesignId ?? null
        }))
      }

      // Create the Sale
      const res = await $fetch<{ sale: { id: number } }>('/api/sales', {
        method: 'POST',
        body: saleData
      })

      // 2. If 'billNow' is checked, call the billing endpoint immediately
      if (billNow && res?.sale?.id) {
        await $fetch(`/api/sales/${res.sale.id}/bill`, {
          method: 'POST',
          body: { status: 'paid' }
        })
      }

      toast.add({
        title: 'Venda gerada com sucesso!',
        description: billNow
          ? 'A venda foi criada e faturada!'
          : 'A venda foi criada como pendente.',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })

      // Cleanup & Close
      isPromoteModalOpen.value = false
      promoteTarget.value = null // Libera o objeto da memória

      // 3. Trigger callback se existir (Desacoplamento Inteligente)
      if (options?.onSuccess) {
        await options.onSuccess()
      }
    } catch (e: any) {
      console.error('[usePromoteQuote] Falha na conversão:', e)
      toast.add({
        title: 'Erro na conversão',
        description: getApiError(e),
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
    } finally {
      isPromoting.value = false
    }
  }

  const openPromoteModal = (q: Quote) => {
    promoteTarget.value = q
    isPromoteModalOpen.value = true
  }

  return {
    isPromoteModalOpen,
    promoteTarget,
    isPromoting,
    promoteToSale,
    openPromoteModal
  }
}
