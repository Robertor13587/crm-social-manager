import { ref } from 'vue'
import { useWhatsAppStore } from '@/stores'
import { normalizePhone, normalizePhoneInput } from './useWhatsAppFormatting'

const splitCsvLine = (line: string, delimiter: string): string[] => {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else { inQuotes = !inQuotes }
      continue
    }
    if (!inQuotes && ch === delimiter) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

const parseCsvContacts = (text: string): { name: string; phone: string }[] => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const sample = lines.slice(0, Math.min(10, lines.length)).join('\n')
  const delimiter = (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ';' : ','
  const header = splitCsvLine(lines[0], delimiter).map(h => h.toLowerCase())
  const idxPhone = header.findIndex(h => ['phone', 'telefono', 'numero', 'numero_telefono', 'tel', 'cellulare', 'mobile'].some(k => h.includes(k)))
  const idxName = header.findIndex(h => ['name', 'nome', 'full name', 'fullname', 'nominativo'].some(k => h.includes(k)))
  const idxSurname = header.findIndex(h => ['cognome', 'surname', 'last name', 'lastname'].some(k => h.includes(k)))
  const getPhone = (cols: string[]) => {
    const candidate = idxPhone >= 0 ? cols[idxPhone] : cols.find(c => /\+?\d[\d\s().-]{6,}/.test(c)) || ''
    return normalizePhone(String(candidate || ''))
  }
  const getName = (cols: string[]) => {
    const n = idxName >= 0 ? cols[idxName] : ''
    const s = idxSurname >= 0 ? cols[idxSurname] : ''
    return `${n || ''} ${s || ''}`.trim()
  }
  const contacts: { name: string; phone: string }[] = []
  for (const row of lines.slice(1)) {
    const cols = splitCsvLine(row, delimiter)
    const phone = getPhone(cols)
    if (!phone) continue
    contacts.push({ name: getName(cols) || phone, phone })
  }
  return contacts
}

const parseVcfContacts = (text: string): { name: string; phone: string }[] => {
  const blocks = text.split(/BEGIN:VCARD/i).slice(1).map(b => 'BEGIN:VCARD' + b)
  const contacts: { name: string; phone: string }[] = []
  for (const b of blocks) {
    const fn = (b.match(/\nFN(?:;[^:]*)?:([^\n\r]+)/i)?.[1] || '').trim()
    const tels = Array.from(b.matchAll(/\nTEL(?:;[^:]*)?:([^\n\r]+)/gi)).map(m => String(m[1] || '').trim())
    const phone = normalizePhone(tels[0] || '')
    if (!phone) continue
    contacts.push({ name: fn || phone, phone })
  }
  return contacts
}

export const useWhatsAppFileImport = (onImportDone: () => Promise<void>) => {
  const waStore = useWhatsAppStore()
  const fileInput = ref<HTMLInputElement | null>(null)

  const triggerFileImport = () => fileInput.value?.click()

  const readFileAsText = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('File read error'))
    reader.readAsText(file)
  })

  const onFileSelected = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    try {
      const name = String(file.name || '').toLowerCase()
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        alert('Import .xlsx/.xls non supportato senza backend dedicato. Esporta in .csv o .vcf.')
        return
      }
      const text = await readFileAsText(file)
      const parsed = name.endsWith('.vcf') ? parseVcfContacts(text) : parseCsvContacts(text)
      if (!parsed.length) { alert('Nessun contatto valido trovato nel file.'); return }
      for (const c of parsed) {
        try { await waStore.createContact(String(c.name || c.phone), normalizePhoneInput(String(c.phone || ''))) } catch {}
      }
      await onImportDone()
      alert(`Import riuscito. Contatti importati: ${parsed.length}`)
    } finally {
      target.value = ''
    }
  }

  const importPhoneContacts = async () => {
    const anyNav = navigator as any
    if (!anyNav?.contacts || typeof anyNav.contacts.select !== 'function') {
      alert('Importazione rubrica non supportata su questo dispositivo/browser. Usa "Nuovo Contatto" per aggiungerli manualmente.')
      return
    }
    try {
      const picked = await anyNav.contacts.select(['name', 'tel', 'email'], { multiple: true })
      for (const p of (Array.isArray(picked) ? picked : [])) {
        const name = (p.name && p.name[0]) || String(p.name || '')
        const tel = (p.tel && p.tel[0]) || ''
        const phone = tel ? normalizePhone(String(tel)) : ''
        if (!phone) continue
        try { await waStore.createContact(String(name || phone), normalizePhoneInput(phone), ['Rubrica']) } catch {}
      }
      await onImportDone()
      alert('Importazione completata.')
    } catch {
      alert('Importazione annullata o fallita.')
    }
  }

  return { fileInput, triggerFileImport, onFileSelected, importPhoneContacts }
}
