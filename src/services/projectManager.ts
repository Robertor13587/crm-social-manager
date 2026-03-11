import type { RequestEnvelope, ResponseEnvelope, Channel, Action } from '../agents/types'
import { validateContact, validateMessage } from '../agents/databaseAgent'
import { handleWhatsApp } from '../agents/messagingConnector'

const supportedChannels: Channel[] = ['whatsapp']
const supportedActions: Action[] = [
  'send_message',
  'create_contact',
  'update_contact',
  'list_contacts',
  'list_messages',
  'import_contacts',
]

export async function routeRequest(req: RequestEnvelope): Promise<ResponseEnvelope> {
  const now = new Date().toISOString()

  if (!supportedChannels.includes(req.channel)) {
    return { status: 'error', message: `Unknown channel: ${req.channel}`, code: 'BAD_REQUEST' }
  }
  if (!supportedActions.includes(req.action)) {
    return { status: 'error', message: `Unknown action: ${req.action}`, code: 'BAD_REQUEST' }
  }

  try {
    if (req.channel === 'whatsapp') {
      switch (req.action) {
        case 'send_message': {
          const v = validateMessage(req.payload)
          if (!v.valid) return { status: 'error', message: v.error || 'invalid payload', code: 'VALIDATION_ERROR' }
          const data = await handleWhatsApp(req.action, v.data!)
          return { status: 'ok', channel: 'whatsapp', action: 'send_message', data, meta: { timestamp: now } }
        }
        case 'create_contact': {
          const v = validateContact(req.payload)
          if (!v.valid) return { status: 'error', message: v.error || 'invalid payload', code: 'VALIDATION_ERROR' }
          const data = await handleWhatsApp(req.action, v.data!)
          return { status: 'ok', channel: 'whatsapp', action: 'create_contact', data, meta: { timestamp: now } }
        }
        case 'update_contact': {
          const v = validateContact(req.payload)
          // update requires valid payload (id is often in payload or handled by backend logic)
          if (!v.valid) return { status: 'error', message: v.error || 'invalid payload', code: 'VALIDATION_ERROR' }
          const data = await handleWhatsApp(req.action, v.data!)
          return { status: 'ok', channel: 'whatsapp', action: 'update_contact', data, meta: { timestamp: now } }
        }
        case 'list_contacts': {
          const data = await handleWhatsApp('list_contacts', {})
          const count = Array.isArray(data?.items) ? data.items.length : undefined
          return { status: 'ok', channel: 'whatsapp', action: 'list_contacts', data, meta: { timestamp: now, count } }
        }
        case 'list_messages': {
          const data = await handleWhatsApp('list_messages', req.payload)
          const count = Array.isArray(data?.messages) ? data.messages.length : undefined
          return { status: 'ok', channel: 'whatsapp', action: 'list_messages', data, meta: { timestamp: now, count } }
        }
        case 'import_contacts': {
          const v = validateContact(req.payload)
          const data = await handleWhatsApp('import_contacts', v.valid ? v.data! : req.payload)
          return { status: 'ok', channel: 'whatsapp', action: 'import_contacts', data, meta: { timestamp: now } }
        }
      }
    }
    return { status: 'error', message: 'Unhandled route', code: 'NOT_IMPLEMENTED' }
  } catch (err: any) {
    const msg = err?.message || 'Unhandled error'
    return { status: 'error', message: msg, code: 'INTERNAL_ERROR' }
  }
}
