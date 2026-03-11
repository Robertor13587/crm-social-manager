import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useWhatsAppStore } from '@/stores'
import { normalizePhone, normalizePhoneInput, parseCSV } from './useWhatsAppFormatting'

export const useWhatsAppContacts = () => {
  const waStore = useWhatsAppStore()
  const { contacts } = storeToRefs(waStore)

  // Filter & pagination state
  const searchQuery = ref('')
  const tagFilter = ref('')
  const dateFilter = ref('')
  const currentPage = ref(1)
  const pageSize = ref(25)

  // Google Sheet contacts
  const sheetContacts = ref<any[]>([])

  // Modal state
  const showAddContact = ref(false)
  const showEditContact = ref(false)
  const newContact = ref({ name: '', phone: '', tag: '' })
  const editContactData = ref<{
    id: string; name: string; phone: string; tag: string; excelData: any | null
  }>({ id: '', name: '', phone: '', tag: '', excelData: null })

  // Computed: merge DB + sheet contacts, deduped by phone
  const allContacts = computed(() => {
    const merged = [...contacts.value, ...sheetContacts.value]
    const seen = new Set<string>()
    const deduped: any[] = []
    for (const c of merged) {
      const key = normalizePhone((c.phone || '').toString()) || c.id
      if (!key || !seen.has(key)) {
        if (key) seen.add(key)
        deduped.push(c)
      }
    }
    return deduped
  })

  const distinctTags = computed(() => {
    const set = new Set<string>()
    allContacts.value.forEach(c => { if (c.tag) set.add(String(c.tag)) })
    return Array.from(set).sort()
  })

  const filteredContacts = computed(() => {
    let list = allContacts.value
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      list = list.filter(c =>
        String(c.name || '').toLowerCase().includes(query) ||
        String(c.phone || '').toLowerCase().includes(query) ||
        String(c.tag || '').toLowerCase().includes(query) ||
        String(c.notes || '').toLowerCase().includes(query)
      )
    }
    if (tagFilter.value) {
      list = list.filter(c => String(c.tag || '') === tagFilter.value)
    }
    if (dateFilter.value) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      list = list.filter(c => {
        const raw = (c as any).createdAt || (c as any).created_at
        if (!raw) return false
        const d = new Date(raw)
        if (Number.isNaN(d.getTime())) return false
        switch (dateFilter.value) {
          case 'today': return d >= today
          case 'week': return d >= new Date(today.getTime() - 7 * 86400000)
          case 'month': return d >= new Date(today.getTime() - 30 * 86400000)
          default: return true
        }
      })
    }
    return list
  })

  const contactsTotal = computed(() => allContacts.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(filteredContacts.value.length / pageSize.value)))
  const pagedContacts = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredContacts.value.slice(start, start + pageSize.value)
  })

  const contactsByPhone = computed(() => {
    const map = new Map<string, string>()
    for (const c of contacts.value) {
      const key = normalizePhone(String((c as any).phone || ''))
      const name = String((c as any).name || '').trim()
      if (key && name) map.set(key, name)
    }
    return map
  })

  const resolveContactName = (phone: string, fallback: string): string => {
    const key = normalizePhone(String(phone || ''))
    const fromDb = key ? contactsByPhone.value.get(key) : ''
    return fromDb && fromDb.trim().length ? fromDb : fallback
  }

  // Actions
  const loadContacts = async () => {
    await waStore.loadContacts()
  }

  const createContact = async (onSuccess?: () => void) => {
    try {
      await waStore.createContact(
        newContact.value.name,
        normalizePhoneInput(newContact.value.phone),
        newContact.value.tag ? [newContact.value.tag] : [],
      )
      showAddContact.value = false
      newContact.value = { name: '', phone: '', tag: '' }
      onSuccess?.()
    } catch (e: any) {
      alert('Errore salvataggio contatto: ' + (e.message || 'errore'))
    }
  }

  const startEdit = (contact: any) => {
    editContactData.value = {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      tag: contact.tag,
      excelData: contact.excelData || null,
    }
    showEditContact.value = true
  }

  const updateContact = async (onSuccess?: () => void) => {
    try {
      await waStore.updateContact(
        editContactData.value.id,
        editContactData.value.name,
        editContactData.value.phone,
        editContactData.value.tag ? [editContactData.value.tag] : [],
      )
      showEditContact.value = false
      onSuccess?.()
    } catch (e: any) {
      alert('Errore aggiornamento contatto: ' + (e.message || 'errore'))
    }
  }

  const clearFilters = () => {
    searchQuery.value = ''
    tagFilter.value = ''
    dateFilter.value = ''
  }

  // Load contacts from Google Sheets CSV
  const loadSheetContacts = async () => {
    try {
      const url = 'https://docs.google.com/spreadsheets/d/12PkbupGV86oAlbt2KfUMezjb8c1-Ft15W-qNR89ZasA/export?format=csv&gid=285366314'
      const resp = await fetch(url)
      if (!resp.ok) return
      const csv = await resp.text()
      const rows = parseCSV(csv).filter(r => r.length > 0)
      if (rows.length === 0) { sheetContacts.value = []; return }
      const header = rows[0].map(h => h.trim().toUpperCase())
      const idx = (name: string) => header.indexOf(name.toUpperCase())
      const mapRow = (r: string[]) => {
        const get = (name: string) => { const i = idx(name); return i >= 0 ? (r[i] || '').trim() : '' }
        const cognome = get('COGNOME')
        const nome = get('NOME')
        const attivita = get("ATTIVITA'") || get('ATTIVITA')
        const anno = get('ANNO')
        const provenienza = get('PROVENIENZA')
        const numeroTelefono = get('NUMERO TELEFONO')
        const email = get('EMAIL')
        const messaggio = get('MESSAGGIO')
        const risposta = get('RISPOSTA')
        const notaCampionato = get('NOTA DI CAMPIONATO')
        const contatto = get('CONTATTO')
        const note = get('NOTE')
        const phoneNorm = normalizePhone((numeroTelefono || '').toString())
        const displayName = (nome || cognome) ? `${nome} ${cognome}`.trim() : (contatto || numeroTelefono || 'Contatto')
        return {
          id: `excel-${phoneNorm || Math.random().toString(36).slice(2)}`,
          name: displayName,
          phone: phoneNorm,
          tag: 'import excel',
          notes: note || '',
          lastMessage: '',
          createdAt: '',
          excelData: { cognome, nome, attivita, anno, provenienza, numero_telefono: numeroTelefono, email, messaggio, risposta, nota_di_campionato: notaCampionato, contatto, note },
        }
      }
      sheetContacts.value = rows.slice(1).map(mapRow).filter(c => c.phone || c.name)
    } catch {
      sheetContacts.value = []
    }
  }

  return {
    // State
    searchQuery, tagFilter, dateFilter, currentPage, pageSize, sheetContacts,
    showAddContact, showEditContact, newContact, editContactData,
    // Computed
    allContacts, filteredContacts, pagedContacts, totalPages, contactsTotal, distinctTags, contactsByPhone,
    // Methods
    loadContacts, createContact, startEdit, updateContact, clearFilters,
    resolveContactName, loadSheetContacts,
  }
}
