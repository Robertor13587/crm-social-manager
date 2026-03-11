import { executeBackend } from './backendApiHelper'
import { formatWhatsApp } from './frontendHelper'

const endpoints = {
  send_message: {
    method: 'POST',
    url: '/webhook/crm/whatsapp/send',
  },
  create_contact: {
    method: 'POST',
    url: '/webhook/crm/whatsapp/contact/create',
  },
  update_contact: {
    method: 'POST', // n8n webhook usually POST unless specified otherwise, docs say POST for updates? No docs for update yet, assuming POST/PUT
    url: '/webhook/crm/whatsapp/contact/update',
  },
  list_contacts: {
    method: 'GET',
    url: '/webhook/crm/whatsapp/contacts',
  },
  list_messages: {
    method: 'GET',
    url: '/webhook/crm/whatsapp/messages',
  },
  import_contacts: {
    method: 'POST',
    url: '/webhook/contacts/import/google',
  },
} as const

type ActionKey = keyof typeof endpoints

export async function handleWhatsApp(action: ActionKey, payload: any) {
  const def = endpoints[action]
  let url = def.url
  if (def.method === 'GET' && payload && Object.keys(payload).length > 0) {
    const q = new URLSearchParams(payload).toString()
    url += `?${q}`
  }
  const res = await executeBackend({ method: def.method, url, body: def.method === 'GET' ? undefined : payload })
  return formatWhatsApp(action, res)
}
