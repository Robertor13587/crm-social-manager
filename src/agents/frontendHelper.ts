type Any = any

export function formatWhatsApp(action: string, backendRaw: { response: Any }): Any {
  const r = backendRaw?.response

  // Check for n8n "Workflow was started" default response
  if (r?.message === 'Workflow was started') {
    throw new Error('N8N_WORKFLOW_NO_RESPONSE_NODE')
  }

  switch (action) {
    case 'list_contacts': {
      const rawItems = Array.isArray(r?.items) ? r.items : Array.isArray(r?.contacts) ? r.contacts : Array.isArray(r) ? r : []
      const items = rawItems.map((c: Any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || c.phone_e164,
        phone_e164: c.phone_e164 || c.phone,
        tags: c.tags || [],
        notes: c.notes || c.note
      }))
      return { items }
    }
    case 'list_messages': {
      const rawMsgs = Array.isArray(r?.messages) ? r.messages : Array.isArray(r) ? r : []
      const messages = rawMsgs.map((m: Any) => ({
        id: m.id || m.wa_id,
        content: m.message || m.content,
        direction: m.direction,
        from: m.from_phone,
        to: m.to_phone,
        created_at: m.timestamp || m.created_at
      }))
      return { messages }
    }
    case 'create_contact': {
      const id = r?.id || r?.contact_id
      return { id, contact: r }
    }
    case 'update_contact': {
      return { id: r?.id, contact: r }
    }
    case 'send_message': {
      const message_id = r?.message_id || r?.id
      const status = r?.status || 'sent'
      const phone = r?.phone
      return { message_id, status, phone }
    }
    case 'import_contacts': {
      const imported = r?.imported || r?.count || 0
      const failed = r?.failed || 0
      return { imported, failed, report: r?.report }
    }
    default:
      return r
  }
}

