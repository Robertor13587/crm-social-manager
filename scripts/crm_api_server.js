import dotenv from 'dotenv'
import { Buffer } from 'node:buffer'
import http from 'node:http'
import { URL, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import process from 'node:process'
import jwt from 'jsonwebtoken'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const PORT = Number(process.env.PORT || 8787)
const FRONTEND_ORIGINS = String(
  process.env.FRONTEND_ORIGIN || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173',
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const N8N_BASE_URL = String(process.env.N8N_BASE_URL || process.env.VITE_N8N_BASE_URL || 'https://workflow.robdev.website').replace(/\/$/, '')

function json(res, statusCode, body, extraHeaders = {}) {
  const payload = JSON.stringify(body ?? {})
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...extraHeaders,
  })
  res.end(payload)
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || '')
  const allowOrigin = FRONTEND_ORIGINS.includes(origin) ? origin : FRONTEND_ORIGINS[0] || '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function getJsonBody(req) {
  const buf = await getBody(req)
  const raw = buf.toString('utf8').trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch (err) {
    const e = new Error('INVALID_JSON')
    e.code = 'INVALID_JSON'
    throw e
  }
}

function normalizePhoneInput(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const digits = s.replace(/\D/g, '')
  if (!digits) return ''
  return s.startsWith('+') ? `+${digits}` : `+${digits}`
}

function parseNumberParam(value, def, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return def
  const i = Math.trunc(n)
  if (typeof min === 'number' && i < min) return def
  if (typeof max === 'number' && i > max) return def
  return i
}

function parseBoolEnv(value) {
  const s = String(value || '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}

const PROXY_LOG_EVENTS = parseBoolEnv(process.env.PROXY_LOG_EVENTS)

function hashClientKey(key) {
  const s = String(key || '').trim()
  if (!s) return 'unknown'
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 10)
}

function proxyLog(event, fields = {}, level = 'info') {
  if (!PROXY_LOG_EVENTS) return
  const payload = {
    ts: new Date().toISOString(),
    scope: 'crm_api_server',
    component: 'proxy',
    event: String(event || ''),
    ...fields,
  }
  if (level === 'error') console.error(JSON.stringify(payload))
  else console.log(JSON.stringify(payload))
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const configured = Boolean(url && key)
  return { configured, url, key }
}

function getWhatsAppEnv() {
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WA_PHONE_NUMBER_ID ||
    process.env.WA_PHONE_NUMBER ||
    ''
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.ACCESS_TOKEN ||
    process.env.WA_ACCESS_TOKEN ||
    ''
  const configured = Boolean(String(phoneNumberId).trim() && String(accessToken).trim())
  return { configured, phoneNumberId: String(phoneNumberId).trim(), accessToken: String(accessToken).trim() }
}

function getFacebookEnv() {
  const pageId = process.env.FB_PAGE_ID || process.env.FACEBOOK_PAGE_ID || ''
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || ''
  const userToken = process.env.FB_USER_ACCESS_TOKEN || process.env.META_USER_ACCESS_TOKEN || ''
  const configured = Boolean(String(pageId).trim() && (String(pageToken).trim() || String(userToken).trim()))
  return { configured, pageId: String(pageId).trim(), pageToken: String(pageToken).trim(), userToken: String(userToken).trim() }
}

function getInstagramEnv() {
  const igId = process.env.IG_USER_ID || process.env.IG_ACCOUNT_ID || process.env.INSTAGRAM_ACCOUNT_ID || ''
  const pageToken = process.env.IG_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || ''
  const userToken = process.env.IG_USER_ACCESS_TOKEN || process.env.META_USER_ACCESS_TOKEN || ''
  const configured = Boolean(String(igId).trim() && (String(pageToken).trim() || String(userToken).trim()))
  return { configured, igId: String(igId).trim(), pageToken: String(pageToken).trim(), userToken: String(userToken).trim() }
}

function cleanToken(t) {
  return String(t || '').trim().replace(/^Bearer\s+/i, '').replace(/^\"+|\"+$/g, '').replace(/\s+/g, '')
}

async function resolvePageToken(page_id, page_token, user_token) {
  const pt = cleanToken(page_token)
  const ut = cleanToken(user_token)
  if (!page_id || !ut) return pt
  try {
    const url = `https://graph.facebook.com/v24.0/${encodeURIComponent(page_id)}?fields=access_token&access_token=${encodeURIComponent(ut)}`
    const r = await fetch(url)
    const j = await r.json().catch(() => null)
    if (j?.access_token) return cleanToken(j.access_token)
  } catch {}
  return pt
}

let supabaseClient = null

function initSupabase() {
  const { url, key } = getSupabaseEnv()
  return createClient(url, key, { auth: { persistSession: false } })
}

async function getDb() {
  const env = getSupabaseEnv()
  if (!env.configured) {
    const err = new Error('SUPABASE_NOT_CONFIGURED')
    err.code = 'SUPABASE_NOT_CONFIGURED'
    throw err
  }
  if (!supabaseClient) supabaseClient = initSupabase()
  return supabaseClient
}

async function getDbOrNull() {
  try {
    return await getDb()
  } catch {
    return null
  }
}

async function queryContacts(supabase) {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, phone, tags, notes, created_at')
    .eq('platform', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (error) throw error
  const items = (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    phone_e164: r.phone,
    tags: Array.isArray(r.tags) ? r.tags : [],
    note: r.notes,
    notes: r.notes,
    created_at: r.created_at,
  }))
  return { items }
}

async function queryConversations(supabase, { limit, offset }) {
  const lim = parseNumberParam(limit, 20, 1, 100)
  const off = parseNumberParam(offset, 0, 0, 1_000_000)

  const { count } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('platform', 'whatsapp')
  const total = count || 0

  const { data: rows, error } = await supabase
    .from('conversations')
    .select('id, last_message_at, last_message_preview, contacts!inner(id, name, phone)')
    .eq('platform', 'whatsapp')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(off, off + lim - 1)
  if (error) throw error

  const data = (rows || []).map((r) => ({
    conversation_id: r.contacts.phone,
    contact_phone: r.contacts.phone,
    phone: r.contacts.phone,
    last_message: r.last_message_preview,
    last_timestamp: r.last_message_at,
    from_phone: r.contacts.phone,
    to_phone: null,
    direction: null,
  }))

  return { status: 'ok', total, data }
}

async function queryMessages(supabase, { phone, order, limit, offset }) {
  const ascending = String(order || 'asc').toLowerCase() !== 'desc'
  const lim = parseNumberParam(limit, 200, 1, 500)
  const off = parseNumberParam(offset, 0, 0, 5_000_000)
  const canonical = normalizePhoneInput(phone)

  let convIds = []
  let contactPhone = canonical

  if (canonical) {
    const digits = canonical.replace(/\D/g, '')
    const candidates = Array.from(new Set([canonical, `+${digits}`, digits].filter(Boolean)))
    const { data: contactData } = await supabase
      .from('contacts')
      .select('id, phone')
      .eq('platform', 'whatsapp')
      .in('phone', candidates)
    if (contactData?.length) {
      contactPhone = contactData[0].phone
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .eq('platform', 'whatsapp')
        .in('contact_id', contactData.map((c) => c.id))
      convIds = (convData || []).map((c) => c.id)
    }
  }

  if (!convIds.length && canonical) return { status: 'ok', count: 0, messages: [] }

  let query = supabase
    .from('messages')
    .select('id, platform_message_id, sender_id, content, direction, status, platform_timestamp, conversation_id')
    .order('platform_timestamp', { ascending, nullsFirst: false })
    .range(off, off + lim - 1)

  if (convIds.length) query = query.in('conversation_id', convIds)

  const { data: rows, error } = await query
  if (error) throw error

  const messages = (rows || []).map((r) => ({
    id: r.platform_message_id || r.id,
    wa_id: r.platform_message_id || null,
    from_phone: r.direction === 'inbound' ? contactPhone : null,
    to_phone: r.direction === 'outbound' ? contactPhone : null,
    direction: r.direction === 'inbound' ? 'incoming' : 'outgoing',
    message: r.content,
    timestamp: r.platform_timestamp,
    created_at: r.platform_timestamp,
    status: r.status,
  }))
  return { status: 'ok', count: messages.length, messages }
}

async function queryCanSendText(supabase, { phone }) {
  const canonical = normalizePhoneInput(phone)
  if (!canonical) return { status: 'ok', data: { can_send_text: false } }
  const digits = canonical.replace(/\D/g, '')
  const candidates = Array.from(new Set([canonical, `+${digits}`, digits].filter(Boolean)))

  const { data: contactData } = await supabase
    .from('contacts')
    .select('id')
    .eq('platform', 'whatsapp')
    .in('phone', candidates)
  if (!contactData?.length) return { status: 'ok', data: { can_send_text: false } }

  const { data: convData } = await supabase
    .from('conversations')
    .select('id')
    .eq('platform', 'whatsapp')
    .in('contact_id', contactData.map((c) => c.id))
  if (!convData?.length) return { status: 'ok', data: { can_send_text: false } }

  const { data } = await supabase
    .from('messages')
    .select('platform_timestamp')
    .in('conversation_id', convData.map((c) => c.id))
    .eq('direction', 'inbound')
    .order('platform_timestamp', { ascending: false })
    .limit(1)

  const lastTs = data?.[0]?.platform_timestamp ? new Date(data[0].platform_timestamp) : null
  const ok = Boolean(lastTs && Number.isFinite(lastTs.getTime()) && Date.now() - lastTs.getTime() <= 24 * 60 * 60 * 1000)
  return { status: 'ok', data: { can_send_text: ok } }
}

function normalizeTags(raw) {
  if (raw === null || typeof raw === 'undefined') return undefined
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean)
  const s = String(raw).trim()
  if (!s) return []
  if (s.startsWith('[') || s.startsWith('{') || s.startsWith('"')) {
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) return parsed.map((x) => String(x || '').trim()).filter(Boolean)
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()]
    } catch {}
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

async function upsertContact(supabase, { name, phone, tags, note }) {
  const canonicalPhone = normalizePhoneInput(phone)
  if (!canonicalPhone) {
    return { status: 'error', error: { code: 'VALIDATION_ERROR', message: 'phone is required' } }
  }

  const tagsArr = normalizeTags(tags) || []
  const nameValue = name ? String(name).trim() || null : null
  const noteValue = note ? String(note).trim() || null : null
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('platform', 'whatsapp')
    .eq('phone', canonicalPhone)
    .maybeSingle()

  let resultId, action
  if (existing) {
    const updateData = { updated_at: now }
    if (nameValue !== null) updateData.name = nameValue
    if (tags !== undefined) updateData.tags = tagsArr
    if (noteValue !== null) updateData.notes = noteValue
    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error) throw error
    resultId = data.id
    action = 'updated'
  } else {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        platform: 'whatsapp',
        platform_contact_id: canonicalPhone,
        name: nameValue || canonicalPhone,
        phone: canonicalPhone,
        tags: tagsArr,
        notes: noteValue,
      })
      .select('id')
      .single()
    if (error) throw error
    resultId = data.id
    action = 'created'
  }

  return { status: 'ok', data: { id: resultId, action } }
}

async function upsertIgContact(supabase, { ig_id, username, full_name, profile_picture_url, source, interaction_type, interaction_at, comment_id, comment_text }) {
  if (!ig_id) return { status: 'error', message: 'ig_id required' }
  const now = new Date().toISOString()
  const intAt = interaction_at ? new Date(interaction_at).toISOString() : now
  const src = source || interaction_type || 'dm'

  const { data: existing } = await supabase
    .from('instagram_contacts')
    .select('id, interactions_count')
    .eq('ig_id', String(ig_id))
    .maybeSingle()

  if (existing) {
    const updateData = {
      last_interaction: intAt,
      last_interaction_type: interaction_type || src,
      interactions_count: (existing.interactions_count || 0) + 1,
      updated_at: now,
    }
    if (username) updateData.username = username
    if (full_name) updateData.name = full_name
    if (profile_picture_url) updateData.profile_picture = profile_picture_url
    if (comment_id) updateData.last_comment_id = comment_id
    if (comment_text) updateData.last_comment_text = comment_text
    await supabase.from('instagram_contacts').update(updateData).eq('ig_id', String(ig_id))
  } else {
    await supabase.from('instagram_contacts').insert({
      ig_id: String(ig_id),
      username: username || null,
      name: full_name || null,
      profile_picture: profile_picture_url || null,
      first_seen_source: src,
      last_interaction: intAt,
      last_interaction_type: interaction_type || src,
      last_comment_id: comment_id || null,
      last_comment_text: comment_text || null,
      interactions_count: 1,
      imported_at: now,
    })
  }
  return { status: 'ok', action: 'upsert_contact', ig_id }
}

async function findOrCreateWaConversation(supabase, phone) {
  const canonicalPhone = normalizePhoneInput(phone)
  if (!canonicalPhone) return null

  let { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('platform', 'whatsapp')
    .eq('phone', canonicalPhone)
    .maybeSingle()

  if (!contact) {
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({ platform: 'whatsapp', platform_contact_id: canonicalPhone, name: canonicalPhone, phone: canonicalPhone })
      .select('id')
      .single()
    if (error) return null
    contact = newContact
  }

  let { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('platform', 'whatsapp')
    .eq('contact_id', contact.id)
    .maybeSingle()

  if (!conversation) {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ platform: 'whatsapp', platform_conversation_id: canonicalPhone, contact_id: contact.id, status: 'new' })
      .select('id')
      .single()
    if (error) return null
    conversation = newConv
  }

  return { contactId: contact.id, conversationId: conversation.id }
}

async function logOutgoingMessage(supabase, { wa_id, to_phone, message, status }) {
  const canonicalPhone = normalizePhoneInput(to_phone)
  if (!canonicalPhone) return

  try {
    const conv = await findOrCreateWaConversation(supabase, canonicalPhone)
    if (!conv) return
    const now = new Date().toISOString()

    await supabase.from('messages').upsert({
      conversation_id: conv.conversationId,
      platform_message_id: wa_id || null,
      content: message || null,
      type: 'text',
      direction: 'outbound',
      status: status || 'sent',
      platform_timestamp: now,
    }, { onConflict: 'platform_message_id', ignoreDuplicates: false })

    await supabase.from('conversations')
      .update({ last_message_at: now, last_message_preview: message ? String(message).slice(0, 200) : null, updated_at: now })
      .eq('id', conv.conversationId)
  } catch (err) {
    console.error('logOutgoingMessage error', err)
  }
}

async function sendWhatsAppText({ phone, text }) {
  const waEnv = getWhatsAppEnv()
  if (!waEnv.configured) {
    return { status: 'error', error: { code: 'WA_NOT_CONFIGURED', message: 'WhatsApp credentials not configured' } }
  }
  const canonicalPhone = normalizePhoneInput(phone)
  const trimmedText = String(text || '').trim()
  if (!canonicalPhone || !trimmedText) {
    return { status: 'error', error: { code: 'VALIDATION_ERROR', message: 'phone and text are required' } }
  }
  const to = canonicalPhone.replace(/\D/g, '')
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { preview_url: false, body: trimmedText },
  }
  const target = `https://graph.facebook.com/v24.0/${waEnv.phoneNumberId}/messages`
  let upstreamPayload = null
  let upstreamStatus = 0
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${waEnv.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    upstreamStatus = upstream.status
    upstreamPayload = await upstream.json().catch(async () => ({ raw: await upstream.text().catch(() => '') }))
    if (!upstream.ok) {
      const msg = String(upstreamPayload?.error?.message || upstreamPayload?.message || 'WhatsApp API error')
      return {
        status: 'error',
        error: { code: 'WA_API_ERROR', message: msg, details: { http_status: upstreamStatus, raw: upstreamPayload } },
      }
    }
  } catch (err) {
    return {
      status: 'error',
      error: { code: 'WA_API_ERROR', message: String(err?.message || err || 'WhatsApp API error'), details: { raw: upstreamPayload } },
    }
  }

  const messageId = String(upstreamPayload?.messages?.[0]?.id || '')
  if (!messageId) {
    return {
      status: 'error',
      error: { code: 'WA_API_ERROR', message: 'Missing message id', details: { http_status: upstreamStatus, raw: upstreamPayload } },
    }
  }

  return { status: 'ok', data: { message_id: messageId, status: 'sent', phone: canonicalPhone } }
}

async function sendWhatsAppMedia({ phone, type, media_url, caption }) {
  const waEnv = getWhatsAppEnv()
  if (!waEnv.configured) {
    return { status: 'error', error: { code: 'WA_NOT_CONFIGURED', message: 'WhatsApp credentials not configured' } }
  }
  const canonicalPhone = normalizePhoneInput(phone)
  const mediaType = String(type || '').trim().toLowerCase()
  const mediaUrl = String(media_url || '').trim()
  const cap = typeof caption === 'undefined' ? '' : String(caption || '').trim()

  if (!canonicalPhone || !mediaType || !mediaUrl) {
    return { status: 'error', error: { code: 'VALIDATION_ERROR', message: 'phone, type and media_url are required' } }
  }
  if (!['image', 'audio', 'document', 'video'].includes(mediaType)) {
    return { status: 'error', error: { code: 'VALIDATION_ERROR', message: 'type must be image|audio|document|video' } }
  }

  const to = canonicalPhone.replace(/\D/g, '')
  const mediaObj = { link: mediaUrl }
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: mediaType,
    [mediaType]: cap && mediaType !== 'audio' ? { ...mediaObj, caption: cap } : mediaObj,
  }

  const target = `https://graph.facebook.com/v24.0/${waEnv.phoneNumberId}/messages`
  let upstreamPayload = null
  let upstreamStatus = 0
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${waEnv.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    upstreamStatus = upstream.status
    upstreamPayload = await upstream.json().catch(async () => ({ raw: await upstream.text().catch(() => '') }))
    if (!upstream.ok) {
      const msg = String(upstreamPayload?.error?.message || upstreamPayload?.message || 'WhatsApp API error')
      return {
        status: 'error',
        error: { code: 'WA_API_ERROR', message: msg, details: { http_status: upstreamStatus, raw: upstreamPayload } },
      }
    }
  } catch (err) {
    return {
      status: 'error',
      error: { code: 'WA_API_ERROR', message: String(err?.message || err || 'WhatsApp API error'), details: { raw: upstreamPayload } },
    }
  }

  const messageId = String(upstreamPayload?.messages?.[0]?.id || '')
  if (!messageId) {
    return {
      status: 'error',
      error: { code: 'WA_API_ERROR', message: 'Missing message id', details: { http_status: upstreamStatus, raw: upstreamPayload } },
    }
  }

  return { status: 'ok', data: { message_id: messageId, status: 'sent', phone: canonicalPhone } }
}

function renderTemplateContent(content, variables) {
  const base = String(content || '')
  if (!variables || typeof variables !== 'object') return base
  return base.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = variables[key]
    if (v === null || typeof v === 'undefined') return ''
    return String(v)
  })
}

async function sendWhatsAppTemplate({ phone, template_name, language_code, body_params, components }) {
  const waEnv = getWhatsAppEnv()
  if (!waEnv.configured) {
    return { status: 'error', error: { code: 'WA_NOT_CONFIGURED', message: 'WhatsApp credentials not configured' } }
  }
  const canonicalPhone = normalizePhoneInput(phone)
  const name = String(template_name || '').trim()
  const lang = String(language_code || 'it').trim() || 'it'
  if (!canonicalPhone || !name) {
    return { status: 'error', error: { code: 'VALIDATION_ERROR', message: 'phone and template_name are required' } }
  }

  let outComponents = []
  if (Array.isArray(components)) {
    outComponents = components
  } else if (Array.isArray(body_params) && body_params.length) {
    outComponents = [
      {
        type: 'body',
        parameters: body_params.map((p) => ({ type: 'text', text: String(p ?? '') })),
      },
    ]
  }

  const to = canonicalPhone.replace(/\D/g, '')
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name,
      language: { code: lang },
      ...(outComponents.length ? { components: outComponents } : {}),
    },
  }

  const target = `https://graph.facebook.com/v24.0/${waEnv.phoneNumberId}/messages`
  let upstreamPayload = null
  let upstreamStatus = 0
  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { Authorization: `Bearer ${waEnv.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    upstreamStatus = upstream.status
    upstreamPayload = await upstream.json().catch(async () => ({ raw: await upstream.text().catch(() => '') }))
    if (!upstream.ok) {
      const msg = String(upstreamPayload?.error?.message || upstreamPayload?.message || 'WhatsApp API error')
      return {
        status: 'error',
        error: { code: 'WA_API_ERROR', message: msg, details: { http_status: upstreamStatus, raw: upstreamPayload } },
      }
    }
  } catch (err) {
    return {
      status: 'error',
      error: { code: 'WA_API_ERROR', message: String(err?.message || err || 'WhatsApp API error'), details: { raw: upstreamPayload } },
    }
  }

  const messageId = String(upstreamPayload?.messages?.[0]?.id || '')
  if (!messageId) {
    return {
      status: 'error',
      error: { code: 'WA_API_ERROR', message: 'Missing message id', details: { http_status: upstreamStatus, raw: upstreamPayload } },
    }
  }

  return { status: 'ok', data: { message_id: messageId, status: 'sent', phone: canonicalPhone } }
}



function shouldHandleLocally(pathname) {
  return (
    pathname === '/webhook/crm/auth/login' ||
    pathname === '/webhook/crm/facebook/conversations' ||
    pathname === '/webhook/crm/facebook/messages' ||
    pathname === '/webhook/crm/facebook/insights' ||
    pathname === '/webhook/crm/facebook/messages/send' ||
    pathname === '/webhook/crm/instagram/conversations' ||
    pathname === '/webhook/crm/instagram/messages' ||
    pathname === '/webhook/crm/instagram/insights' ||
    pathname === '/webhook/crm/instagram/send' ||
    pathname === '/webhook/crm/instagram/contacts' ||
    pathname === '/webhook/crm/instagram/media' ||
    pathname === '/webhook/crm/instagram/media/list' ||
    pathname === '/webhook/crm/instagram/media/comments' ||
    pathname === '/webhook/internal/instagram/contact/enrich' ||
    pathname === '/webhook/internal/instagram/contact/upsert' ||
    pathname === '/webhook/internal/instagram/comments/import' ||
    pathname === '/webhook/meta/whatsapp/webhook' ||
    pathname === '/webhook/crm/instagram/oauth/callback' ||
    pathname === '/webhook/crm/whatsapp/contacts' ||
    pathname === '/webhook/crm/whatsapp/conversations' ||
    pathname === '/webhook/crm/whatsapp/messages' ||
    pathname === '/webhook/crm/whatsapp/can-send-text' ||
    pathname === '/webhook/crm/whatsapp/contact/create' ||
    pathname === '/webhook/crm/whatsapp/contact/update' ||
    pathname === '/webhook/crm/whatsapp/send' ||
    pathname === '/webhook/crm/whatsapp/send-media' ||
    pathname === '/webhook/crm/whatsapp/send-template' ||
    pathname === '/webhook/crm/whatsapp/send-approved-template'
  )
}

function getClientKey(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').trim()
  if (xf) return xf.split(',')[0].trim()
  return String(req.socket?.remoteAddress || '').trim() || 'unknown'
}

function buildCacheKey({ method, url, req }) {
  const auth = String(req.headers.authorization || '').trim()
  const hdr = auth ? `|auth:${crypto.createHash('sha256').update(auth).digest('hex')}` : ''
  return `${method.toUpperCase()}|${String(url)}${hdr}`
}

function getProxyCacheTtlMs(pathname) {
  const p = String(pathname || '')
  if (/^\/webhook\/crm\/meta\/profile$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_META_PROFILE_MS, 5 * 60_000, 0, 60 * 60_000)
  if (/^\/webhook\/crm\/facebook\/profile$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_FB_PROFILE_MS, 5 * 60_000, 0, 60 * 60_000)
  if (/^\/webhook\/crm\/facebook\/stats$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_FB_STATS_MS, 60_000, 0, 60 * 60_000)
  if (/^\/webhook\/crm\/instagram\/profile$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_IG_PROFILE_MS, 5 * 60_000, 0, 60 * 60_000)
  if (/^\/webhook\/crm\/instagram\/conversations$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_IG_CONVERSATIONS_MS, 10_000, 0, 60 * 60_000)
  if (/^\/webhook\/crm\/instagram\/messages$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_IG_MESSAGES_MS, 5_000, 0, 60 * 60_000)
  if (/^\/webhook\/crm\/facebook\/conversations$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_FB_CONVERSATIONS_MS, 10_000, 0, 60 * 60_000)
  if (/^\/webhook\/crm\/facebook\/messages$/i.test(p)) return parseNumberParam(process.env.PROXY_CACHE_TTL_FB_MESSAGES_MS, 5_000, 0, 60 * 60_000)
  return 0
}

const proxyCache = new Map()
const PROXY_CACHE_MAX_ENTRIES = parseNumberParam(process.env.PROXY_CACHE_MAX_ENTRIES, 200, 0, 10_000)
const PROXY_CACHE_MAX_BYTES = parseNumberParam(process.env.PROXY_CACHE_MAX_BYTES, 1024 * 1024, 0, 50 * 1024 * 1024)

function proxyCacheGet(key) {
  const entry = proxyCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    proxyCache.delete(key)
    return null
  }
  proxyCache.delete(key)
  proxyCache.set(key, entry)
  return entry
}

function proxyCacheSet(key, entry) {
  if (!PROXY_CACHE_MAX_ENTRIES) return
  if (entry?.body && entry.body.length > PROXY_CACHE_MAX_BYTES) return
  proxyCache.set(key, entry)
  while (proxyCache.size > PROXY_CACHE_MAX_ENTRIES) {
    const firstKey = proxyCache.keys().next().value
    if (typeof firstKey === 'undefined') break
    proxyCache.delete(firstKey)
  }
}

const proxyRateState = new Map()
const PROXY_RATE_ENABLE = parseBoolEnv(process.env.PROXY_RATE_ENABLE ?? 'true')
const PROXY_RATE_RPS = parseNumberParam(process.env.PROXY_RATE_RPS, 15, 1, 10_000)
const PROXY_RATE_BURST = parseNumberParam(process.env.PROXY_RATE_BURST, 60, 1, 100_000)
const PROXY_RATE_MAX_CLIENTS = parseNumberParam(process.env.PROXY_RATE_MAX_CLIENTS, 5000, 0, 1_000_000)
const PROXY_RATE_CLIENT_TTL_MS = parseNumberParam(process.env.PROXY_RATE_CLIENT_TTL_MS, 10 * 60_000, 0, 24 * 60 * 60_000)

function proxyRatePrune(now) {
  if (!PROXY_RATE_MAX_CLIENTS) return
  if (proxyRateState.size <= PROXY_RATE_MAX_CLIENTS) return
  if (PROXY_RATE_CLIENT_TTL_MS) {
    for (const [k, v] of proxyRateState.entries()) {
      if (now - Number(v?.last || 0) > PROXY_RATE_CLIENT_TTL_MS) proxyRateState.delete(k)
      if (proxyRateState.size <= PROXY_RATE_MAX_CLIENTS) return
    }
  }
  while (proxyRateState.size > PROXY_RATE_MAX_CLIENTS) {
    const firstKey = proxyRateState.keys().next().value
    if (typeof firstKey === 'undefined') break
    proxyRateState.delete(firstKey)
  }
}

function proxyRateAllow(req) {
  if (!PROXY_RATE_ENABLE) return true
  const key = getClientKey(req)
  const now = Date.now()
  proxyRatePrune(now)
  const state = proxyRateState.get(key) || { tokens: PROXY_RATE_BURST, last: now }
  const elapsed = Math.max(0, now - state.last)
  const refill = (elapsed / 1000) * PROXY_RATE_RPS
  state.tokens = Math.min(PROXY_RATE_BURST, state.tokens + refill)
  state.last = now
  if (state.tokens < 1) {
    proxyRateState.set(key, state)
    return false
  }
  state.tokens -= 1
  proxyRateState.set(key, state)
  return true
}

const n8nBreaker = {
  failures: 0,
  lastFailureAt: 0,
  openUntil: 0,
}

const N8N_BREAKER_FAIL_WINDOW_MS = parseNumberParam(process.env.N8N_BREAKER_FAIL_WINDOW_MS, 30_000, 0, 10 * 60_000)
const N8N_BREAKER_THRESHOLD = parseNumberParam(process.env.N8N_BREAKER_THRESHOLD, 5, 1, 10_000)
const N8N_BREAKER_OPEN_MS = parseNumberParam(process.env.N8N_BREAKER_OPEN_MS, 15_000, 0, 10 * 60_000)

function n8nBreakerIsOpen() {
  return Date.now() < n8nBreaker.openUntil
}

function n8nBreakerRecordFailure() {
  const now = Date.now()
  const wasOpen = n8nBreakerIsOpen()
  if (now - n8nBreaker.lastFailureAt > N8N_BREAKER_FAIL_WINDOW_MS) n8nBreaker.failures = 0
  n8nBreaker.failures += 1
  n8nBreaker.lastFailureAt = now
  if (n8nBreaker.failures >= N8N_BREAKER_THRESHOLD) {
    n8nBreaker.openUntil = now + N8N_BREAKER_OPEN_MS
    if (!wasOpen) {
      proxyLog('n8n_breaker_open', { failures: n8nBreaker.failures, open_ms: N8N_BREAKER_OPEN_MS, open_until: n8nBreaker.openUntil })
    }
  }
}

function n8nBreakerRecordSuccess() {
  const wasOpen = n8nBreakerIsOpen()
  const hadFailures = n8nBreaker.failures > 0
  n8nBreaker.failures = 0
  n8nBreaker.lastFailureAt = 0
  n8nBreaker.openUntil = 0
  if (wasOpen || hadFailures) proxyLog('n8n_breaker_close', {})
}

async function proxyToN8n(req, res, url) {
  const startAt = Date.now()
  const target = new URL(url.pathname + url.search, N8N_BASE_URL)
  const method = String(req.method || 'GET').toUpperCase()
  const client = hashClientKey(getClientKey(req))

  const ttlMs = method === 'GET' ? getProxyCacheTtlMs(url.pathname) : 0
  const cacheKey = ttlMs > 0 ? buildCacheKey({ method, url: target, req }) : null
  if (cacheKey) {
    const cached = proxyCacheGet(cacheKey)
    if (cached) {
      const outHeaders = { ...corsHeaders(req), ...cached.upstreamHeaders, 'Content-Length': cached.body.length, 'X-Proxy-Cache': 'HIT' }
      res.writeHead(cached.status, outHeaders)
      res.end(cached.body)
      proxyLog('proxy_cache_hit', { method, pathname: url.pathname, status: cached.status, ttl_ms: ttlMs, bytes: cached.body.length, client })
      return
    }
  }

  if (!proxyRateAllow(req)) {
    proxyLog('proxy_rate_limited', { method, pathname: url.pathname, client }, 'error')
    json(
      res,
      429,
      { status: 'error', error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { ...corsHeaders(req), 'Retry-After': '1' },
    )
    return
  }

  if (n8nBreakerIsOpen()) {
    if (cacheKey) {
      const cached = proxyCacheGet(cacheKey)
      if (cached) {
        const outHeaders = { ...corsHeaders(req), ...cached.upstreamHeaders, 'Content-Length': cached.body.length, 'X-Proxy-Cache': 'HIT' }
        res.writeHead(cached.status, outHeaders)
        res.end(cached.body)
        proxyLog('proxy_cache_hit', { method, pathname: url.pathname, status: cached.status, ttl_ms: ttlMs, bytes: cached.body.length, client })
        return
      }
    }
    proxyLog('proxy_breaker_open', { method, pathname: url.pathname, client }, 'error')
    res.writeHead(503, { ...corsHeaders(req), 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': String(Math.ceil(N8N_BREAKER_OPEN_MS / 1000)) })
    res.end(JSON.stringify({ status: 'error', error: { code: 'N8N_UNAVAILABLE', message: 'Upstream temporarily unavailable' } }))
    return
  }

  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'undefined') continue
    if (Array.isArray(v)) headers.set(k, v.join(','))
    else headers.set(k, String(v))
  }

  headers.delete('host')
  headers.delete('content-length')
  headers.delete('accept-encoding')
  headers.set('accept-encoding', 'identity')

  const body = method === 'GET' || method === 'HEAD' ? undefined : await getBody(req)

  let upstream = null
  try {
    upstream = await fetch(String(target), { method, headers, body })
  } catch (err) {
    n8nBreakerRecordFailure()
    proxyLog('proxy_upstream_fetch_failed', { method, pathname: url.pathname, client, duration_ms: Date.now() - startAt, message: String(err?.message || err || '') }, 'error')
    json(res, 502, { status: 'error', error: { code: 'UPSTREAM_FETCH_FAILED', message: String(err?.message || err) } }, corsHeaders(req))
    return
  }

  const upstreamHeaders = {}
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === 'content-length') return
    if (k === 'content-encoding') return
    if (k === 'transfer-encoding') return
    if (k === 'access-control-allow-origin') return
    if (k === 'access-control-allow-headers') return
    if (k === 'access-control-allow-methods') return
    if (k === 'access-control-max-age') return
    if (k === 'set-cookie') return
    upstreamHeaders[key] = value
  })

  const buf = Buffer.from(await upstream.arrayBuffer())
  const outHeaders = { ...corsHeaders(req), ...upstreamHeaders, 'Content-Length': buf.length, 'X-Proxy-Cache': 'MISS' }
  res.writeHead(upstream.status, outHeaders)
  res.end(buf)
  proxyLog('proxy_upstream_response', { method, pathname: url.pathname, client, status: upstream.status, duration_ms: Date.now() - startAt, bytes: buf.length, cache_ttl_ms: ttlMs || 0 })

  if (upstream.status >= 500) n8nBreakerRecordFailure()
  else n8nBreakerRecordSuccess()

  const ct = String(upstream.headers.get('content-type') || '')
  if (cacheKey && upstream.status >= 200 && upstream.status < 300 && ttlMs > 0 && (ct.includes('application/json') || ct.startsWith('text/'))) {
    proxyCacheSet(cacheKey, { expiresAt: Date.now() + ttlMs, status: upstream.status, upstreamHeaders, body: buf })
    proxyLog('proxy_cache_set', { method, pathname: url.pathname, client, ttl_ms: ttlMs, status: upstream.status, bytes: buf.length })
  }
}

export async function startCrmApiServer({ port = PORT } = {}) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(req))
      res.end()
      return
    }

    const headers = corsHeaders(req)

    try {
      if (url.pathname === '/health') {
        const env = getSupabaseEnv()
        let db = { configured: env.configured, ok: false, error: env.configured ? 'SUPABASE_CONNECT_FAILED' : 'SUPABASE_NOT_CONFIGURED' }
        if (env.configured) {
          try {
            const client = await getDb()
            const { error } = await client.from('users').select('id', { count: 'exact', head: true })
            if (error) throw error
            db = { configured: true, ok: true }
          } catch (err) {
            db = {
              configured: true,
              ok: false,
              error: 'SUPABASE_CONNECT_FAILED',
              code: String(err?.code || ''),
              message: String(err?.message || ''),
            }
          }
        }
        json(res, 200, { status: 'ok', db }, headers)
        return
      }

      if (shouldHandleLocally(url.pathname)) {
        if (req.method === 'GET') {
          const supabase = await getDbOrNull()
          if (!supabase) {
            await proxyToN8n(req, res, url)
            return
          }
          const db = supabase

          if (url.pathname === '/webhook/crm/facebook/conversations') {
            const fbEnv = getFacebookEnv()
            if (!fbEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const token = await resolvePageToken(fbEnv.pageId, fbEnv.pageToken, fbEnv.userToken)
            if (!token) {
              json(res, 401, { status: 'error', message: 'Missing FB PAGE_ACCESS_TOKEN' }, headers)
              return
            }
            const target = `https://graph.facebook.com/v24.0/${fbEnv.pageId}/conversations?fields=senders,updated_time&limit=50`
            const upstream = await fetch(target, { headers: { Authorization: `Bearer ${token}` } })
            const raw = await upstream.json().catch(() => ({}))
            if (!upstream.ok) {
              const msg = raw?.error?.message || 'Request failed'
              json(res, upstream.status, { status: 'error', channel: 'facebook', conversations: [], error: { code: raw?.error?.code, type: raw?.error?.type, message: msg } }, headers)
              return
            }
            json(res, 200, { status: 'ok', channel: 'facebook', conversations: raw?.data || [] }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/facebook/messages') {
            const threadId = url.searchParams.get('thread_id')
            if (!threadId) {
              json(res, 400, { status: 'error', message: 'Missing thread_id' }, headers)
              return
            }
            const fbEnv = getFacebookEnv()
            if (!fbEnv.configured) {
               await proxyToN8n(req, res, url)
               return
            }
            const token = await resolvePageToken(fbEnv.pageId, fbEnv.pageToken, fbEnv.userToken)
            const target = `https://graph.facebook.com/v24.0/${encodeURIComponent(threadId)}?fields=messages.limit(200){from,to,created_time,message,attachments}&access_token=${encodeURIComponent(token)}`
            const upstream = await fetch(target)
            const raw = await upstream.json().catch(() => ({}))
            if (!upstream.ok) {
              json(res, upstream.status, raw, headers)
              return
            }
            json(res, 200, { status: 'ok', thread_id: raw.id, messages: raw.messages?.data || [] }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/facebook/insights') {
            const fbEnv = getFacebookEnv()
            if (!fbEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const metrics = url.searchParams.get('metrics') || url.searchParams.get('metric') || 'page_impressions'
            const period = url.searchParams.get('period') || 'day'
            const datePreset = url.searchParams.get('date_preset') || url.searchParams.get('preset') || 'last_28d'
            const token = await resolvePageToken(fbEnv.pageId, fbEnv.pageToken, fbEnv.userToken)
            
            const params = new URLSearchParams()
            params.set('metric', metrics)
            params.set('period', period)
            params.set('date_preset', datePreset)
            params.set('access_token', token)
            
            const target = `https://graph.facebook.com/v24.0/${fbEnv.pageId}/insights?${params.toString()}`
            const upstream = await fetch(target)
            const raw = await upstream.json().catch(() => ({}))
            
            const data = raw.data || []
            const formattedMetrics = data.map((m) => ({
              metric: m.name,
              period: m.period,
              title: m.title || null,
              description: m.description || null,
              values: m.values || []
            }))
            
            json(res, 200, {
              status: 'ok',
              channel: 'facebook',
              page_id: fbEnv.pageId,
              metrics: formattedMetrics,
              paging: raw.paging || null
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/instagram/conversations') {
            const fbEnv = getFacebookEnv()
            const igEnv = getInstagramEnv()
            if (!fbEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const token = await resolvePageToken(fbEnv.pageId, fbEnv.pageToken, fbEnv.userToken)
            if (!token) {
              json(res, 401, { status: 'error', message: 'Missing PAGE_ACCESS_TOKEN' }, headers)
              return
            }
            const limit = url.searchParams.get('limit') || 25
            const after = url.searchParams.get('after')
            const before = url.searchParams.get('before')
            
            const params = new URLSearchParams()
            params.set('platform', 'instagram')
            params.set('fields', 'id,updated_time,participants,messages.limit(1){from,message,created_time}')
            params.set('limit', limit)
            params.set('access_token', token)
            if (after) params.set('after', after)
            if (before) params.set('before', before)

            const target = `https://graph.facebook.com/v24.0/${fbEnv.pageId}/conversations?${params.toString()}`
            const upstream = await fetch(target)
            const body = await upstream.json().catch(() => ({}))
            
            if (!upstream.ok) {
              json(res, upstream.status, { status: 'error', channel: 'instagram', total: 0, data: [], error: body.error || null, meta: { http_status: upstream.status, graph_error: body.error } }, headers)
              return
            }

            const data = Array.isArray(body.data) ? body.data : []
            const myId = igEnv.igId || null

            const normalizeLastMessage = (value) => {
              if (value == null) return null;
              const s = String(value);
              if (s === '') return '[contenuto non testuale o messaggio vuoto]';
              return s;
            };

            const mapped = data.map((c) => {
              const convId = String(c?.id ?? '').trim();
              if (!convId) return null;
              const participants = c?.participants?.data ?? [];
              const messages = c?.messages?.data ?? [];
              const lastMsg = messages[0] ?? null;

              const contact = Array.isArray(participants)
                ? participants.find((p) => {
                    const pid = String(p?.id ?? '').trim();
                    if (!pid) return false;
                    if (myId) return pid !== myId;
                    return true;
                  }) ?? participants[0]
                : null;

              let lastDirection = null;
              if (myId && lastMsg?.from?.id) {
                lastDirection = String(lastMsg.from.id) === myId ? 'outgoing' : 'incoming';
              }

              return {
                conversation_id: convId,
                contact_ig_id: contact?.id ?? null,
                contact_name: contact?.username ?? contact?.name ?? null,
                last_message: normalizeLastMessage(lastMsg?.message),
                last_direction: lastDirection,
                last_timestamp: lastMsg?.created_time ?? null,
                updated_time: c?.updated_time ?? null,
                channel: 'instagram',
                raw: c
              };
            }).filter(Boolean);

            json(res, 200, {
              status: 'ok',
              channel: 'instagram',
              total: mapped.length,
              data: mapped,
              paging: body.paging || null,
              meta: { http_status: upstream.status, graph_error: null }
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/instagram/messages') {
            const threadId = url.searchParams.get('thread_id')
            if (!threadId) {
              json(res, 400, { status: 'error', message: 'Missing thread_id' }, headers)
              return
            }
            const fbEnv = getFacebookEnv()
            if (!fbEnv.configured) {
               await proxyToN8n(req, res, url)
               return
            }
            const token = await resolvePageToken(fbEnv.pageId, fbEnv.pageToken, fbEnv.userToken)
            const limit = url.searchParams.get('limit') || 50
            const after = url.searchParams.get('after')
            const before = url.searchParams.get('before')
            
            let targetParams = `fields=id,from,to,created_time,message,attachments&limit=${limit}&access_token=${encodeURIComponent(token)}`
            if (after) targetParams += `&after=${encodeURIComponent(after)}`
            if (before) targetParams += `&before=${encodeURIComponent(before)}`
            
            const target = `https://graph.facebook.com/v24.0/${encodeURIComponent(threadId)}/messages?${targetParams}`
            const upstream = await fetch(target)
            const raw = await upstream.json().catch(() => ({}))
            
            if (!upstream.ok) {
              json(res, upstream.status, raw, headers)
              return
            }
            
            json(res, 200, {
              status: 'ok',
              channel: 'instagram',
              thread_id: threadId,
              total: Array.isArray(raw.data) ? raw.data.length : 0,
              messages: raw.data || [],
              paging: raw.paging || null
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/instagram/insights') {
            const igEnv = getInstagramEnv()
            if (!igEnv.configured || !igEnv.igId) {
              await proxyToN8n(req, res, url)
              return
            }
            const metrics = url.searchParams.get('metrics') || url.searchParams.get('metric') || 'impressions,reach,profile_views'
            const period = url.searchParams.get('period') || 'day'
            const sinceObj = url.searchParams.get('since')
            const untilObj = url.searchParams.get('until')
            const daysObj = url.searchParams.get('days') || 28
            
            let since = sinceObj;
            let until = untilObj;
            
            if (!since || !until) {
              const now = Math.floor(Date.now() / 1000);
              const sinceTs = now - Number(daysObj) * 86400;
              since = String(sinceTs);
              until = String(now);
            }
            
            const token = igEnv.pageToken || igEnv.userToken
            const params = new URLSearchParams()
            params.set('metric', metrics)
            params.set('period', period)
            if (since) params.set('since', since)
            if (until) params.set('until', until)
            params.set('access_token', token)
            
            const target = `https://graph.facebook.com/v24.0/${igEnv.igId}/insights?${params.toString()}`
            const upstream = await fetch(target)
            const raw = await upstream.json().catch(() => ({}))
            
            const data = raw.data || []
            const formattedMetrics = data.map((m) => ({
              metric: m.name,
              period: m.period,
              title: m.title || null,
              description: m.description || null,
              values: m.values || []
            }))
            
            json(res, 200, {
              status: 'ok',
              channel: 'instagram',
              ig_user_id: igEnv.igId,
              metrics: formattedMetrics,
              paging: raw.paging || null
            }, headers)
            return
          }

          if (url.pathname === '/webhook/meta/whatsapp/webhook') {
            const challenge = url.searchParams.get('hub.challenge') || ''
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end(challenge)
            return
          }

          if (url.pathname === '/webhook/meta/whatsapp/webhook') {
            const challenge = url.searchParams.get('hub.challenge') || ''
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end(challenge)
            return
          }

          if (url.pathname === '/webhook/crm/instagram/oauth/callback') {
            const challenge = url.searchParams.get('hub.challenge')
            const mode = url.searchParams.get('hub.mode')
            if (mode === 'subscribe' && challenge) {
              res.writeHead(200, { 'Content-Type': 'text/plain' })
              res.end(challenge)
              return
            }
            
            const code = url.searchParams.get('code')
            if (code) {
              // We just display a message since N8N datatables are removed.
              // We would need the user to exchange this code manually or implement it pointing to env
              console.log('Received Instagram OAuth Code:', code)
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end('<h1>Instagram OAuth connected</h1><p>Code received successfully. Please check server logs.</p>')
              return
            }
            
            json(res, 400, { status: 'error', message: 'Missing parameters' }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/instagram/contacts') {
            const igSb = await getDbOrNull()
            if (!igSb) {
              await proxyToN8n(req, res, url)
              return
            }
            const limit = Math.min(Number(url.searchParams.get('limit') || url.searchParams.get('_limit')) || 20, 100)
            const offset = Math.max(Number(url.searchParams.get('offset') || url.searchParams.get('_offset')) || 0, 0)

            const { data: rows, error: rowsErr } = await igSb
              .from('instagram_contacts')
              .select('ig_id, username, name, profile_picture, first_seen_source, last_interaction_type, last_interaction, last_comment_id, last_comment_text, interactions_count')
              .order('last_interaction', { ascending: false, nullsFirst: false })
              .range(offset, offset + limit - 1)
            const { count } = await igSb
              .from('instagram_contacts')
              .select('id', { count: 'exact', head: true })
            if (rowsErr) throw rowsErr
            const mapped = (rows || []).map((r) => ({
              ig_id: r.ig_id,
              username: r.username,
              full_name: r.name,
              profile_picture_url: r.profile_picture,
              source: r.first_seen_source,
              last_interaction_type: r.last_interaction_type,
              last_interaction_at: r.last_interaction,
              last_comment_id: r.last_comment_id,
              last_comment_text: r.last_comment_text,
              total_interactions: r.interactions_count,
            }))
            json(res, 200, {
              status: 'ok',
              channel: 'instagram',
              total: count || mapped.length,
              limit,
              offset,
              data: mapped,
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/instagram/media' || url.pathname === '/webhook/crm/instagram/media/list') {
            const igEnv = getInstagramEnv()
            if (!igEnv.configured || !igEnv.igId) {
              await proxyToN8n(req, res, url)
              return
            }
            const limit = Math.min(Number(url.searchParams.get('limit')) || 25, 100)
            const after = url.searchParams.get('after')
            const token = igEnv.pageToken || igEnv.userToken

            let fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,permalink'
            if (url.pathname === '/webhook/crm/instagram/media') {
               fields = 'id,caption,media_type,media_url,permalink,timestamp,comments_count,like_count'
            }

            const target = `https://graph.facebook.com/v24.0/${igEnv.igId}/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}${after ? '&after=' + encodeURIComponent(after) : ''}`
            const upstream = await fetch(target)
            const raw = await upstream.json().catch(() => ({}))

            const data = raw.data || []
            if (url.pathname === '/webhook/crm/instagram/media') {
              json(res, 200, {
                status: 'ok',
                channel: 'instagram',
                total: data.length,
                media: data
              }, headers)
            } else {
              const paging = raw.paging || {}
              const cursors = paging.cursors || {}
              const nextCursor = cursors.after || null
              const items = data.map(m => {
                const tsRaw = m.timestamp || null
                const tsFormatted = tsRaw ? tsRaw.replace('T', ' ').replace('+0000', '') : null
                return {
                  id: m.id || null,
                  caption: m.caption || null,
                  media_type: m.media_type || null,
                  media_url: m.media_url || null,
                  thumbnail_url: m.thumbnail_url || null,
                  permalink: m.permalink || null,
                  timestamp_raw: tsRaw,
                  timestamp: tsFormatted
                }
              })
              json(res, 200, {
                status: 'ok',
                channel: 'instagram',
                count: items.length,
                next_cursor: nextCursor,
                has_next_page: !!nextCursor,
                items
              }, headers)
            }
            return
          }

          if (url.pathname === '/webhook/crm/instagram/media/comments') {
            const igEnv = getInstagramEnv()
            if (!igEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const mediaId = url.searchParams.get('media_id')
            if (!mediaId) {
              json(res, 400, { status: 'error', message: 'media_id is required' }, headers)
              return
            }
            const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100)
            const token = igEnv.pageToken || igEnv.userToken

            const target = `https://graph.facebook.com/v24.0/${encodeURIComponent(mediaId)}/comments?fields=id,text,timestamp&limit=${limit}&access_token=${encodeURIComponent(token)}`
            const upstream = await fetch(target)
            const raw = await upstream.json().catch(() => ({}))
            const data = raw.data || []
            
            const comments = data.map(c => {
              const ts = c.timestamp ? c.timestamp.replace('T', ' ').replace('+0000', '') : new Date().toISOString().slice(0, 19).replace('T', ' ')
              return {
                id: c.id,
                text: c.text || null,
                timestamp_raw: c.timestamp || null,
                timestamp: ts
              }
            })

            json(res, 200, {
              status: 'ok',
              channel: 'instagram',
              media_id: raw.id || mediaId,
              count: comments.length,
              comments
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/whatsapp/contacts') {
            const data = await queryContacts(db)
            json(res, 200, { status: 'ok', ...data }, headers)
            return
          }
          if (url.pathname === '/webhook/crm/whatsapp/conversations') {
            const body = await queryConversations(db, {
              limit: url.searchParams.get('limit'),
              offset: url.searchParams.get('offset'),
            })
            json(res, 200, body, headers)
            return
          }
          if (url.pathname === '/webhook/crm/whatsapp/messages') {
            const body = await queryMessages(db, {
              phone: url.searchParams.get('phone'),
              order: url.searchParams.get('order'),
              limit: url.searchParams.get('limit'),
              offset: url.searchParams.get('offset'),
            })
            json(res, 200, body, headers)
            return
          }
          if (url.pathname === '/webhook/crm/whatsapp/can-send-text') {
            const body = await queryCanSendText(db, { phone: url.searchParams.get('phone') })
            json(res, 200, body, headers)
            return
          }
        }

        if (req.method === 'POST') {
          if (url.pathname === '/webhook/meta/whatsapp/webhook') {
            const body = await getJsonBody(req)
            const entry = body?.entry?.[0]
            if (!entry) { json(res, 200, { status: 'ok' }, headers); return; }
            
            const changes = entry.changes?.[0]?.value
            if (!changes || (!changes.messages && !changes.statuses)) { json(res, 200, { status: 'ok' }, headers); return; }

            const waSb = await getDbOrNull()
            const toE164 = (raw) => { const s = String(raw || ''); const d = s.replace(/\D/g, ''); return d ? '+' + d : s }
            if (waSb && changes.messages) {
              for (const m of changes.messages) {
                const fromE164 = toE164(m.from)
                const text = m.text?.body || m.image?.caption || m.audio?.caption || m.document?.caption || null
                const ts = new Date(Number(m.timestamp || 0) * 1000).toISOString()
                const wa_id = m.id

                const conv = await findOrCreateWaConversation(waSb, fromE164).catch(() => null)
                if (!conv) continue

                await waSb.from('messages').upsert({
                  conversation_id: conv.conversationId,
                  platform_message_id: wa_id,
                  content: text,
                  type: 'text',
                  direction: 'inbound',
                  status: 'delivered',
                  platform_timestamp: ts,
                }, { onConflict: 'platform_message_id', ignoreDuplicates: false })
                  .catch((err) => { console.error('Error inserting incoming message:', err) })

                await waSb.from('conversations')
                  .update({ last_message_at: ts, last_message_preview: text ? String(text).slice(0, 200) : null, unread_count: 1, updated_at: new Date().toISOString() })
                  .eq('id', conv.conversationId)
                  .catch(() => null)
              }
            } else if (waSb && changes.statuses) {
              for (const s of changes.statuses) {
                await waSb.from('messages')
                  .update({ status: s.status, status_timestamp: new Date().toISOString() })
                  .eq('platform_message_id', s.id)
                  .catch((err) => console.error('Error updating status:', err))
              }
            }
            json(res, 200, { status: 'ok' }, headers)
            return
          }

          if (url.pathname === '/webhook/internal/instagram/contact/upsert') {
            const igUpsertSb = await getDbOrNull()
            if (!igUpsertSb) {
              json(res, 500, { status: 'error', message: 'DB not available' }, headers)
              return
            }
            const body = await getJsonBody(req)
            if (!body?.ig_id) {
              json(res, 400, { status: 'error', message: 'ig_id is required' }, headers)
              return
            }
            const out = await upsertIgContact(igUpsertSb, body)
            json(res, 200, out, headers)
            return
          }

          if (url.pathname === '/webhook/internal/instagram/comments/import') {
            const igImportSb = await getDbOrNull()
            const igEnv = getInstagramEnv()
            if (!igEnv.configured || !igImportSb) {
              await proxyToN8n(req, res, url)
              return
            }
            const body = await getJsonBody(req)
            const mediaId = body?.media_id
            if (!mediaId) {
              json(res, 400, { status: 'error', message: 'media_id is required' }, headers)
              return
            }
            const limit = Math.min(Number(body.limit) || 50, 100)
            const token = igEnv.pageToken || igEnv.userToken

            const target = `https://graph.facebook.com/v24.0/${encodeURIComponent(mediaId)}/comments?fields=id,text,timestamp,username&limit=${limit}&access_token=${encodeURIComponent(token)}`
            const upstream = await fetch(target)
            const raw = await upstream.json().catch(() => ({}))
            const ObjectData = raw.data || []

            for (const c of ObjectData) {
              await upsertIgContact(igImportSb, {
                ig_id: c.id || null,
                username: c.username || null,
                full_name: '',
                profile_picture_url: '',
                source: 'comment',
                interaction_type: 'comment',
                interaction_at: c.timestamp || null,
                comment_id: c.id,
                comment_text: c.text,
              }).catch(() => null)
            }

            json(res, 200, {
              status: 'ok',
              channel: 'instagram',
              imported: ObjectData.length
            }, headers)
            return
          }

          if (url.pathname === '/webhook/internal/instagram/contact/enrich') {
            const igEnrichSb = await getDbOrNull()
            if (!igEnrichSb) {
              json(res, 500, { status: 'error', message: 'DB not available' }, headers)
              return
            }
            const body = await getJsonBody(req)
            if (!body?.ig_id) {
              json(res, 400, { status: 'error', message: 'ig_id is required' }, headers)
              return
            }
            const { data: r, error: enrichErr } = await igEnrichSb
              .from('instagram_contacts')
              .select('ig_id, username, name, profile_picture, first_seen_source, imported_at, last_interaction, last_interaction_type, last_comment_id, last_comment_text, interactions_count, notes, tags, created_at, updated_at')
              .eq('ig_id', String(body.ig_id))
              .maybeSingle()
            if (enrichErr) throw enrichErr
            if (!r) {
              json(res, 200, { status: 'not_found', channel: 'instagram', contact: null }, headers)
              return
            }
            json(res, 200, {
              status: 'ok',
              channel: 'instagram',
              contact: {
                ig_id: r.ig_id || null,
                username: r.username || null,
                full_name: r.name || null,
                profile_picture_url: r.profile_picture || null,
                source: r.first_seen_source || null,
                first_seen_at: r.imported_at || null,
                last_interaction_type: r.last_interaction_type || null,
                last_interaction_at: r.last_interaction || null,
                last_comment_id: r.last_comment_id || null,
                last_comment_text: r.last_comment_text || null,
                total_interactions: typeof r.interactions_count === 'number' ? r.interactions_count : null,
                notes: r.notes || null,
                tags: r.tags || null,
                created_at: r.created_at || null,
                updated_at: r.updated_at || null,
              },
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/instagram/send') {
            const fbEnv = getFacebookEnv()
            if (!fbEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const body = await getJsonBody(req)
            const recipientId = body?.recipient_id;
            const text = body?.text || null;
            const attachmentUrl = body?.attachment_url || null;
            
            if (!recipientId) {
              json(res, 400, { message: 'recipient_id is required' }, headers)
              return
            }
            if (!text && !attachmentUrl) {
              json(res, 400, { message: 'text or attachment_url is required' }, headers)
              return
            }
            const token = await resolvePageToken(fbEnv.pageId, fbEnv.pageToken, fbEnv.userToken)
            if (!token) {
              json(res, 401, { message: 'Missing PAGE_ACCESS_TOKEN' }, headers)
              return
            }
            
            const messagePayload = attachmentUrl
              ? { attachment: { type: 'image', payload: { url: attachmentUrl, is_reusable: true } } }
              : { text: text }

            const reqBody = {
              messaging_product: 'instagram',
              messaging_type: 'RESPONSE',
              recipient: { id: recipientId },
              message: messagePayload
            }

            const r = await fetch(`https://graph.facebook.com/v24.0/${fbEnv.pageId}/messages?access_token=${encodeURIComponent(token)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody)
            });
            const root = await r.json().catch(() => ({}))
            
            json(res, 200, {
              status: root.error ? 'error' : 'sent',
              channel: 'instagram',
              recipient_id: root.recipient_id || null,
              message_id: root.message_id || null,
              error: root.error || null,
              raw: root
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/facebook/messages/send') {
            const fbEnv = getFacebookEnv()
            if (!fbEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const body = await getJsonBody(req)
            const recipientId = body?.recipient_id;
            const text = body?.text || null;
            const media = body?.media || null;
            
            if (!recipientId) {
              json(res, 400, { message: 'recipient_id is required' }, headers)
              return
            }
            if (!text && !media) {
              json(res, 400, { message: 'Either text or media is required' }, headers)
              return
            }
            const token = await resolvePageToken(fbEnv.pageId, fbEnv.pageToken, fbEnv.userToken)
            if (!token) {
              json(res, 401, { message: 'Missing PAGE_ACCESS_TOKEN' }, headers)
              return
            }
            
            const results = []
            
            if (media && media.url) {
              const mediaMsg = {
                messaging_type: 'RESPONSE',
                recipient: { id: recipientId },
                message: {
                  attachment: {
                    type: media.type || 'image',
                    payload: {
                      url: media.url,
                      is_reusable: media.is_reusable !== undefined ? media.is_reusable : true,
                    },
                  },
                },
              };
              const r = await fetch('https://graph.facebook.com/v24.0/me/messages', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(mediaMsg)
              });
              results.push(await r.json().catch(() => ({})))
            }
            
            if (text) {
              const textMsg = {
                messaging_type: 'RESPONSE',
                recipient: { id: recipientId },
                message: { text },
              };
              const r = await fetch('https://graph.facebook.com/v24.0/me/messages', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(textMsg)
              });
              results.push(await r.json().catch(() => ({})))
            }
            
            json(res, 200, { status: 'sent', count: results.length, results }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/auth/login') {
            const loginSb = await getDbOrNull()
            if (!loginSb) {
              json(res, 500, { error: 'server_error', message: 'Database non raggiungibile' }, headers)
              return
            }
            const body = await getJsonBody(req)
            const email = String(body?.email || '').trim().toLowerCase()
            const password = String(body?.password || '')
            if (!email || !password) {
              json(res, 400, { error: 'bad_request', message: 'Email e password sono obbligatorie' }, headers)
              return
            }
            const { data: users } = await loginSb
              .from('users')
              .select('id, name, email, role, password')
              .eq('email', email)
              .limit(1)
            const row = users?.[0]
            if (!row?.id || !row?.password) {
              json(res, 401, { error: 'invalid_credentials', message: 'Credenziali non valide' }, headers)
              return
            }
            const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
            const passwordOk = row.password === password || row.password === passwordHash
            if (!passwordOk) {
              json(res, 401, { error: 'invalid_credentials', message: 'Credenziali non valide' }, headers)
              return
            }
            const payload = {
              sub: String(row.id),
              email: String(row.email || email),
              role: String(row.role || 'user'),
              name: String(row.name || ''),
            }
            const secret = process.env.JWT_SECRET || 'crm-social-manager-super-secret-key-2025'
            const token = jwt.sign(payload, secret, { expiresIn: '7d' })
            json(res, 200, {
              status: 'ok',
              data: {
                token,
                user: { id: row.id, name: payload.name, email: payload.email, role: payload.role },
              },
            }, headers)
            return
          }

          if (url.pathname === '/webhook/crm/whatsapp/contact/create' || url.pathname === '/webhook/crm/whatsapp/contact/update') {
            const contactSb = await getDbOrNull()
            if (!contactSb) {
              await proxyToN8n(req, res, url)
              return
            }
            const body = await getJsonBody(req)
            const out = await upsertContact(contactSb, {
              name: body?.name,
              phone: body?.phone || body?.to,
              tags: body?.tags,
              note: body?.note,
            })
            json(res, 200, out, headers)
            return
          }

          if (url.pathname === '/webhook/crm/whatsapp/send') {
            const body = await getJsonBody(req)
            const waEnv = getWhatsAppEnv()
            if (!waEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const out = await sendWhatsAppText({ phone: body?.phone || body?.to, text: body?.text })

            const sendSb = await getDbOrNull()
            if (sendSb && out?.status === 'ok') {
              await logOutgoingMessage(sendSb, {
                wa_id: String(out.data?.message_id || ''),
                to_phone: out.data?.phone || body?.phone || body?.to,
                message: String(body?.text || '').trim() || null,
                status: String(out.data?.status || 'sent'),
              })
            }

            json(res, 200, out, headers)
            return
          }

          if (url.pathname === '/webhook/crm/whatsapp/send-media') {
            const body = await getJsonBody(req)
            const waEnv = getWhatsAppEnv()
            if (!waEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }
            const out = await sendWhatsAppMedia({
              phone: body?.phone || body?.to,
              type: body?.type,
              media_url: body?.media_url,
              caption: body?.caption,
            })

            const mediaSb = await getDbOrNull()
            if (mediaSb && out?.status === 'ok') {
              const msg = `MEDIA: ${String(body?.type || '').trim()} ${String(body?.media_url || '').trim()}`
              await logOutgoingMessage(mediaSb, {
                wa_id: String(out.data?.message_id || ''),
                to_phone: out.data?.phone || body?.phone || body?.to,
                message: body?.caption ? `${msg} | ${String(body.caption).trim()}` : msg,
                status: String(out.data?.status || 'sent'),
              })
            }

            json(res, 200, out, headers)
            return
          }

          if (url.pathname === '/webhook/crm/whatsapp/send-template') {
            const body = await getJsonBody(req)
            const waEnv = getWhatsAppEnv()
            if (!waEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }

            let out = null
            let logMessage = null

            if (body?.template_name) {
              out = await sendWhatsAppTemplate({
                phone: body?.phone || body?.to,
                template_name: body?.template_name,
                language_code: body?.language_code,
                body_params: body?.body_params,
                components: body?.components,
              })
              const params = Array.isArray(body?.body_params) ? body.body_params.map((x) => String(x ?? '')).join(', ') : ''
              logMessage = params ? `TEMPLATE: ${String(body.template_name)} | params: ${params}` : `TEMPLATE: ${String(body.template_name)}`
            } else if (body?.content) {
              const rendered = renderTemplateContent(body?.content, body?.variables)
              out = await sendWhatsAppText({ phone: body?.phone || body?.to, text: rendered })
              logMessage = String(rendered || '').trim() || null
            } else {
              out = { status: 'error', error: { code: 'VALIDATION_ERROR', message: 'template_name or content is required' } }
            }

            const tmplSb = await getDbOrNull()
            if (tmplSb && out?.status === 'ok') {
              await logOutgoingMessage(tmplSb, {
                wa_id: String(out.data?.message_id || ''),
                to_phone: out.data?.phone || body?.phone || body?.to,
                message: logMessage,
                status: String(out.data?.status || 'sent'),
              })
            }

            json(res, 200, out, headers)
            return
          }

          if (url.pathname === '/webhook/crm/whatsapp/send-approved-template') {
            const body = await getJsonBody(req)
            const waEnv = getWhatsAppEnv()
            if (!waEnv.configured) {
              await proxyToN8n(req, res, url)
              return
            }

            const out = await sendWhatsAppTemplate({
              phone: body?.phone || body?.to,
              template_name: body?.name,
              language_code: body?.language,
              body_params: body?.parameters,
              components: body?.components,
            })

            const approvedSb = await getDbOrNull()
            if (approvedSb && out?.status === 'ok') {
              const params = Array.isArray(body?.parameters) ? body.parameters.map((x) => String(x ?? '')).join(', ') : ''
              const msg = params ? `TEMPLATE_APPROVED: ${String(body?.name || '')} | params: ${params}` : `TEMPLATE_APPROVED: ${String(body?.name || '')}`
              await logOutgoingMessage(approvedSb, {
                wa_id: String(out.data?.message_id || ''),
                to_phone: out.data?.phone || body?.phone || body?.to,
                message: msg,
                status: String(out.data?.status || 'sent'),
              })
            }

            json(res, 200, out, headers)
            return
          }
        }

        await proxyToN8n(req, res, url)
        return
      }

      await proxyToN8n(req, res, url)
    } catch (err) {
      const requestId = crypto.randomBytes(8).toString('hex')
      json(
        res,
        500,
        { status: 'error', message: 'Server error', request_id: requestId },
        headers,
      )
    }
  })

  await new Promise((resolve, reject) => {
    server.listen(port, () => resolve())
    server.on('error', reject)
  })

  const addr = server.address()
  const actualPort = addr && typeof addr === 'object' ? Number(addr.port) : Number(port)
  return { server, port: actualPort }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startCrmApiServer()
    .then(({ port }) => {
      console.log(`CRM API server running on http://localhost:${port}`)
      console.log(`Proxying unknown routes to: ${N8N_BASE_URL}`)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
