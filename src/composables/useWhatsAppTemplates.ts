import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useWhatsAppStore } from '@/stores'
import { normalizePhone, normalizePhoneInput, extractPlaceholders } from './useWhatsAppFormatting'

export const useWhatsAppTemplates = () => {
  const waStore = useWhatsAppStore()
  const { templates, selectedConversation } = storeToRefs(waStore)

  const showTemplateModal = ref(false)
  const selectedTemplate = ref<any | null>(null)
  const selectedTemplateId = ref<string | null>(null)
  const templateVariables = ref<Record<string, string>>({})

  const loadTemplates = async () => {
    await waStore.loadTemplates()
  }

  const openTemplateModal = (template: any) => {
    selectedTemplate.value = template
    const keys = extractPlaceholders(template.content)
    const vars: Record<string, string> = {}
    keys.forEach(k => (vars[k] = ''))
    const contactName = selectedConversation.value?.contact || ''
    const contactPhone = selectedConversation.value?.phone ? normalizePhone(selectedConversation.value.phone) : ''
    keys.forEach(k => {
      const kk = String(k).toLowerCase()
      if (['nome', 'name', 'first_name', 'contact_name'].includes(kk)) vars[k] = contactName
      else if (['phone', 'numero', 'numero_telefono', 'contact_phone'].includes(kk)) vars[k] = contactPhone
    })
    // Smart default: if first key is numeric and template name suggests greeting, use contact name
    if (keys.length > 0 && /^\d+$/.test(String(keys[0])) &&
      (String(template.name || '').toLowerCase().includes('benvenuto') ||
       String(template.content || '').toLowerCase().includes('ciao'))) {
      vars[keys[0]] = contactName
    }
    templateVariables.value = vars
    showTemplateModal.value = true
  }

  const sendSelectedTemplate = () => {
    if (!selectedTemplateId.value) return
    const t = templates.value.find(tt => String(tt.id) === String(selectedTemplateId.value))
    if (!t) return
    openTemplateModal(t)
  }

  return {
    showTemplateModal, selectedTemplate, selectedTemplateId, templateVariables,
    loadTemplates, openTemplateModal, sendSelectedTemplate,
    extractPlaceholders,
    normalizePhone, normalizePhoneInput,
  }
}
