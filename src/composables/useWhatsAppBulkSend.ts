import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useWhatsAppStore } from '@/stores'
import { normalizePhone, normalizePhoneInput, extractPlaceholders } from './useWhatsAppFormatting'

export const useWhatsAppBulkSend = (allContacts: ComputedRef<any[]>) => {
  const waStore = useWhatsAppStore()
  const { bulkSelectedPhones, bulkMessage, templates } = storeToRefs(waStore)

  const bulkSelectedTemplateId = ref<string | null>(null)
  const bulkStatus = ref('')
  const bulkStatusType = ref<'success' | 'error' | ''>('')
  const bulkRateMs = ref(1000)
  const bulkConcurrency = ref(1)

  const bulkSelectedCount = computed(() => bulkSelectedPhones.value.size)
  const canBulkSendText = computed(() => bulkSelectedPhones.value.size > 0 && bulkMessage.value.trim().length > 0)
  const canBulkSendTemplate = computed(() => bulkSelectedPhones.value.size > 0 && !!bulkSelectedTemplateId.value)

  const isBulkSelected = (phone: string): boolean => {
    const p = phone ? normalizePhone(phone) : ''
    return p ? bulkSelectedPhones.value.has(p) : false
  }

  const toggleBulkSelect = (phone: string) => {
    const p = phone ? normalizePhone(phone) : ''
    if (!p) return
    waStore.toggleBulkPhone(p)
  }

  const bulkSelectAllPage = (pagedContacts: any[]) => {
    const s = new Set(waStore.bulkSelectedPhones)
    pagedContacts.forEach(c => { if (c.phone) s.add(normalizePhone(String(c.phone))) })
    waStore.bulkSelectedPhones = s
  }

  const bulkClearSelection = () => { waStore.clearBulkSelection() }

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms))
  const runBulk = async (items: string[], worker: (phone: string) => Promise<boolean>) => {
    let success = 0, failed = 0
    const queue = [...items]
    const runOne = async (phone: string) => {
      try {
        const ok = await worker(phone)
        if (ok) success++; else failed++
      } catch { failed++ } finally { await delay(bulkRateMs.value) }
    }
    const workers: Promise<void>[] = []
    for (let i = 0; i < Math.max(1, bulkConcurrency.value); i++) {
      workers.push((async () => { while (queue.length > 0) await runOne(queue.shift()!) })())
    }
    await Promise.all(workers)
    return { success, failed }
  }

  const bulkSendText = async () => {
    if (!canBulkSendText.value) return
    const phones = Array.from(bulkSelectedPhones.value)
    const { success, failed } = await runBulk(phones, async (p) => {
      const result = await waStore.sendMessage(normalizePhoneInput(p), bulkMessage.value)
      return result.status === 'ok'
    })
    bulkStatus.value = `Inviati: ${success}, falliti: ${failed}`
    bulkStatusType.value = failed === 0 ? 'success' : 'error'
  }

  const bulkSendTemplate = async () => {
    if (!canBulkSendTemplate.value) return
    const t = templates.value.find(tt => String(tt.id) === String(bulkSelectedTemplateId.value))
    if (!t) return
    const keys = extractPlaceholders(t.content)
    const phones = Array.from(bulkSelectedPhones.value)
    const { success, failed } = await runBulk(phones, async (p) => {
      const phone = normalizePhoneInput(p)
      const contact = allContacts.value.find(c => normalizePhone(String(c.phone || '')) === normalizePhone(p))
      const vars: Record<string, string> = {}
      keys.forEach(k => (vars[k] = ''))
      const contactName = contact?.name || ''
      keys.forEach(k => {
        const kk = String(k).toLowerCase()
        if (['nome', 'name', 'first_name', 'contact_name'].includes(kk)) vars[k] = contactName
        else if (['phone', 'numero', 'numero_telefono', 'contact_phone'].includes(kk)) vars[k] = phone
      })
      const result = await waStore.sendTemplate(phone, t.name, t.language || 'it', keys.map(k => vars[k] || ''), t.content)
      return result.status === 'ok'
    })
    bulkStatus.value = `Template inviati: ${success}, falliti: ${failed}`
    bulkStatusType.value = failed === 0 ? 'success' : 'error'
  }

  return {
    bulkSelectedTemplateId, bulkStatus, bulkStatusType, bulkRateMs, bulkConcurrency,
    bulkSelectedCount, canBulkSendText, canBulkSendTemplate,
    isBulkSelected, toggleBulkSelect, bulkSelectAllPage, bulkClearSelection,
    bulkSendText, bulkSendTemplate,
  }
}
