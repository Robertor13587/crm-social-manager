import fetch from 'node-fetch'

const BASE_URL = 'https://workflow.robdev.website/webhook'

async function fetchJson(url) {
  const res = await fetch(url)
  const contentType = String(res.headers.get('content-type') || '')
  const body = contentType.includes('application/json') ? await res.json().catch(() => ({})) : await res.text().catch(() => '')
  return { res, body }
}

function inspect(body) {
  if (body && typeof body === 'object' && (body.message === 'Workflow was started' || body?.data?.message === 'Workflow was started')) {
    return { ok: false, note: 'N8N_WORKFLOW_NO_RESPONSE_NODE' }
  }
  return { ok: true, note: '' }
}

async function check() {
  console.log('🔍 Verifying n8n responses...')
  console.log(`Base: ${BASE_URL}`)

  console.log('\n--- WhatsApp: Contacts ---')
  {
    const { res, body } = await fetchJson(`${BASE_URL}/crm/whatsapp/contacts`)
    console.log('Status:', res.status)
    console.log('Body:', JSON.stringify(body, null, 2))
    const r = inspect(body)
    if (!r.ok) console.error('❌', r.note)
  }

  console.log('\n--- WhatsApp: Conversations ---')
  {
    const { res, body } = await fetchJson(`${BASE_URL}/crm/whatsapp/conversations`)
    console.log('Status:', res.status)
    console.log('Body:', JSON.stringify(body, null, 2))
    const r = inspect(body)
    if (!r.ok) console.error('❌', r.note)
  }

  console.log('\n--- WhatsApp: Messages (sample phone) ---')
  {
    const { res, body } = await fetchJson(`${BASE_URL}/crm/whatsapp/messages?phone=%2B393330000000`)
    console.log('Status:', res.status)
    console.log('Body:', JSON.stringify(body, null, 2))
    const r = inspect(body)
    if (!r.ok) console.error('❌', r.note)
  }

  console.log('\n--- Facebook: Profile ---')
  {
    const { res, body } = await fetchJson(`${BASE_URL}/crm/facebook/profile`)
    console.log('Status:', res.status)
    console.log('Body:', JSON.stringify(body, null, 2))
    const r = inspect(body)
    if (!r.ok) console.error('❌', r.note)
  }

  console.log('\n--- Facebook: Conversations + Messages ---')
  {
    const { res, body } = await fetchJson(`${BASE_URL}/crm/facebook/conversations`)
    console.log('Status:', res.status)
    console.log('Body:', JSON.stringify(body, null, 2))
    const r = inspect(body)
    if (!r.ok) console.error('❌', r.note)

    const list = (body && typeof body === 'object' ? (body.conversations || body.items || body.data?.conversations || body.data?.items) : []) || []
    const first = Array.isArray(list) ? list[0] : null
    const threadId = first?.id || first?.conversation_id || first?.thread_id
    if (threadId) {
      const { res: r2, body: b2 } = await fetchJson(`${BASE_URL}/crm/facebook/messages?thread_id=${encodeURIComponent(String(threadId))}`)
      console.log('Messages status:', r2.status)
      console.log('Messages body:', JSON.stringify(b2, null, 2))
      const rr2 = inspect(b2)
      if (!rr2.ok) console.error('❌', rr2.note)
    }
  }

  console.log('\n--- Instagram: Profile ---')
  {
    const { res, body } = await fetchJson(`${BASE_URL}/crm/instagram/profile`)
    console.log('Status:', res.status)
    console.log('Body:', JSON.stringify(body, null, 2))
    const r = inspect(body)
    if (!r.ok) console.error('❌', r.note)
  }

  console.log('\n--- Instagram: Conversations + Messages ---')
  {
    const { res, body } = await fetchJson(`${BASE_URL}/crm/instagram/conversations`)
    console.log('Status:', res.status)
    console.log('Body:', JSON.stringify(body, null, 2))
    const r = inspect(body)
    if (!r.ok) console.error('❌', r.note)

    const rawList = Array.isArray(body)
      ? body
      : (body?.conversations || body?.items || body?.data?.conversations || body?.data?.items || body?.data || body?.result || body?.response || [])
    const list = Array.isArray(rawList) ? rawList : []
    const first = list[0]
    const threadId = first?.id || first?.thread_id || first?.threadId || first?.conversation_id || first?.conversationId
    if (threadId) {
      const { res: r2, body: b2 } = await fetchJson(`${BASE_URL}/crm/instagram/messages?thread_id=${encodeURIComponent(String(threadId))}`)
      console.log('Messages status:', r2.status)
      console.log('Messages body:', JSON.stringify(b2, null, 2))
      const rr2 = inspect(b2)
      if (!rr2.ok) console.error('❌', rr2.note)
    }
  }
}

check().catch((e) => {
  console.error('❌ verify failed:', e?.message || e)
})
