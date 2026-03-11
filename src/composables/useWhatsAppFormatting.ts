// Pure formatting utilities for WhatsApp — no reactive state

export const fmtDateTime = (s?: string): string => {
  if (!s) return ''
  try {
    const raw = String(s).trim()
    let iso = raw
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) {
      iso = raw.replace(' ', 'T')
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso) && !/[zZ]$/.test(iso) && !/[+-]\d{2}:\d{2}$/.test(iso)) {
      iso += 'Z'
    }
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return s || ''
    const date = d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
    return `${date} ${time}`
  } catch {
    return s || ''
  }
}

export const sortMessagesByCreatedAt = (list: any[]): any[] => {
  return list.slice().sort((a: any, b: any) => {
    const ta = new Date(a.created_at || '').getTime()
    const tb = new Date(b.created_at || '').getTime()
    const aInvalid = Number.isNaN(ta)
    const bInvalid = Number.isNaN(tb)
    if (aInvalid && bInvalid) return 0
    if (aInvalid) return 1
    if (bInvalid) return -1
    return ta - tb
  })
}

export const normalizePhone = (p: string): string => p.replace(/\D/g, '')

export const normalizePhoneInput = (p: string): string => {
  const d = (p || '').replace(/\D/g, '')
  return (p || '').startsWith('+') ? p : (d ? `+${d}` : '')
}

export const normalizeTagValue = (value: any): string => {
  if (Array.isArray(value)) return value[0] || ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0])
      } catch {
        return trimmed
      }
    }
    return trimmed
  }
  if (value == null) return ''
  return String(value)
}

export const parseCSV = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; continue }
      if (ch === '"') { inQuotes = false; continue }
      cell += ch
    } else {
      if (ch === '"') { inQuotes = true; continue }
      if (ch === ',') { row.push(cell.trim()); cell = ''; continue }
      if (ch === '\n' || ch === '\r') {
        if (cell.length > 0 || row.length > 0) { row.push(cell.trim()); rows.push(row); row = []; cell = '' }
        continue
      }
      cell += ch
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell.trim()); rows.push(row) }
  return rows
}

export const extractPlaceholders = (text: string): string[] => {
  const keys: string[] = []
  const re = /\{\{\s*(.*?)\s*\}\}/g
  let m
  while ((m = re.exec(text)) !== null) {
    if (m[1]) keys.push(m[1])
  }
  return Array.from(new Set(keys))
}
