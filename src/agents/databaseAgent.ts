import type { ValidationResult, ContactPayload, MessagePayload } from './types'

function toE164(input?: string): string | undefined {
  if (!input) return undefined
  const digits = String(input).replace(/\D+/g, '')
  if (!digits) return undefined
  return `+${digits}`
}

export function validateContact(payload: any): ValidationResult<ContactPayload> {
  const phone = toE164(payload?.phone)
  if (!phone) return { valid: false, error: 'missing phone' }
  const name = (payload?.name || '').toString().trim()
  const tags = Array.isArray(payload?.tags) ? payload.tags.map(String) : []
  return { valid: true, data: { phone, name, tags } }
}

export function validateMessage(payload: any): ValidationResult<MessagePayload> {
  const phone = toE164(payload?.phone)
  if (!phone) return { valid: false, error: 'missing phone' }
  const text = (payload?.text || '').toString()
  const templateId = payload?.templateId ? String(payload.templateId) : undefined
  const variables = payload?.variables && typeof payload.variables === 'object' ? payload.variables : undefined
  if (!text && !templateId) return { valid: false, error: 'missing text or templateId' }
  return { valid: true, data: { phone, text, templateId, variables } }
}
