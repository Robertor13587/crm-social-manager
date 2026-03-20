/**
 * metaApiService.ts
 *
 * Direct calls to Meta Graph API. Token & config are read from the Supabase
 * `settings` table so n8n is no longer needed as a proxy.
 *
 * Covers:
 *   - WhatsApp: listTemplates(), getPhoneNumbers(), sendMessage(), sendTemplate()
 *
 * Instagram / Facebook tokens are migrated to Supabase settings as part of
 * Phase 3/4 of the migration plan.
 */

import { supabase } from '@/lib/supabase'

const GRAPH_VERSION = 'v24.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

// ─── Internal helpers ────────────────────────────────────────────────────────

interface WaConfig {
  accessToken: string
  phoneNumberId: string
  businessAccountId: string
}

let _waConfigCache: WaConfig | null = null
let _waConfigCacheAt = 0
const WA_CONFIG_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Reads WhatsApp config from Supabase `settings` table.
 * Result is cached for 5 minutes to avoid hammering the DB.
 */
async function getWaConfig(): Promise<WaConfig> {
  const now = Date.now()
  if (_waConfigCache && now - _waConfigCacheAt < WA_CONFIG_TTL_MS) {
    return _waConfigCache
  }

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('category', 'whatsapp')
    .in('key', ['whatsapp.accessToken', 'whatsapp.phoneNumberId', 'whatsapp.businessAccountId'])

  if (error) throw new Error(`Supabase settings read error: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.key] = row.value ?? ''
  }

  const cfg: WaConfig = {
    accessToken: map['whatsapp.accessToken'] ?? '',
    phoneNumberId: map['whatsapp.phoneNumberId'] ?? '',
    businessAccountId: map['whatsapp.businessAccountId'] ?? '',
  }

  if (!cfg.accessToken || !cfg.businessAccountId) {
    throw new Error('WhatsApp credentials not configured in Supabase settings.')
  }

  _waConfigCache = cfg
  _waConfigCacheAt = now
  return cfg
}

/** Invalidate the cached WA config (e.g. after saving new settings). */
export function invalidateWaConfigCache(): void {
  _waConfigCache = null
  _waConfigCacheAt = 0
}

// ─── Response types ──────────────────────────────────────────────────────────

export interface WaTemplate {
  id: string | null
  name: string | null
  language: string | null
  status: string | null
  category: string | null
  preview: string | null
  components: unknown[]
}

export interface WaTemplatesResult {
  status: 'ok' | 'error'
  total: number
  data: WaTemplate[]
  paging: {
    cursors: { before?: string; after?: string } | null
    next: string | null
    previous: string | null
  }
  error?: string
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ListTemplatesParams {
  limit?: number
  after?: string | null
  status?: string | null
  search?: string | null
}

/**
 * List WhatsApp message templates directly from Meta Graph API.
 * Replaces the deprecated "WA - List Templates" n8n workflow.
 *
 * @see https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 */
export async function listWaTemplates(params: ListTemplatesParams = {}): Promise<WaTemplatesResult> {
  const { limit = 100, after = null, status = null, search = null } = params

  const cfg = await getWaConfig()

  const fields = ['name', 'language', 'status', 'category', 'components'].join(',')

  const qs = new URLSearchParams({ fields, limit: String(Math.min(limit, 100)) })
  if (after) qs.set('after', after)
  if (status) qs.set('status', status)
  // Note: search is applied client-side (same as n8n workflow did)

  const url = `${GRAPH_BASE}/${cfg.businessAccountId}/message_templates?${qs}`

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  })

  const json: any = await resp.json().catch(() => ({}))

  if (!resp.ok || json.error) {
    const msg = json?.error?.message || `HTTP ${resp.status}`
    return { status: 'error', total: 0, data: [], paging: { cursors: null, next: null, previous: null }, error: msg }
  }

  const rawList: any[] = Array.isArray(json.data) ? json.data : []

  function extractBodyPreview(components: any[]): string | null {
    if (!Array.isArray(components)) return null
    const body = components.find((c: any) => c.type === 'BODY' || c.type === 'body')
    if (!body) return null
    return body.text || body.example?.body_text?.[0] || null
  }

  let data: WaTemplate[] = rawList.map((t: any) => ({
    id: t.id ?? null,
    name: t.name ?? null,
    language: t.language ?? null,
    status: t.status ?? null,
    category: t.category ?? null,
    preview: extractBodyPreview(t.components),
    components: t.components ?? [],
  }))

  // Client-side search filter (same logic as the n8n workflow)
  if (search) {
    const q = search.toLowerCase()
    data = data.filter(
      (t) =>
        (t.name ?? '').toLowerCase().includes(q) ||
        (t.preview ?? '').toLowerCase().includes(q),
    )
  }

  const paging = json.paging ?? {}

  return {
    status: 'ok',
    total: data.length,
    data,
    paging: {
      cursors: paging.cursors ?? null,
      next: paging.next ?? null,
      previous: paging.previous ?? null,
    },
  }
}

// ─── Phone numbers ───────────────────────────────────────────────────────────

export interface WaPhoneNumber {
  id: string
  display_phone_number: string
  verified_name: string
  status: string
  quality_rating: string
}

export interface WaPhoneNumbersResult {
  status: 'ok' | 'error'
  data: WaPhoneNumber[]
  error?: string
}

/**
 * List phone numbers registered with the WA Business Account.
 * Used to show account status (PENDING, CONNECTED, DISABLED, etc.).
 */
export async function getWaPhoneNumbers(): Promise<WaPhoneNumbersResult> {
  const cfg = await getWaConfig()
  const fields = 'display_phone_number,verified_name,status,quality_rating'
  const url = `${GRAPH_BASE}/${cfg.businessAccountId}/phone_numbers?fields=${fields}`

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  })
  const json: any = await resp.json().catch(() => ({}))

  if (!resp.ok || json.error) {
    const msg = json?.error?.message || `HTTP ${resp.status}`
    return { status: 'error', data: [], error: msg }
  }

  return {
    status: 'ok',
    data: (Array.isArray(json.data) ? json.data : []).map((p: any) => ({
      id: p.id ?? '',
      display_phone_number: p.display_phone_number ?? '',
      verified_name: p.verified_name ?? '',
      status: p.status ?? '',
      quality_rating: p.quality_rating ?? '',
    })),
  }
}

// ─── Send message ─────────────────────────────────────────────────────────────

export interface WaSendResult {
  status: 'ok' | 'error'
  messageId: string | null
  error?: string
}

/**
 * Send a plain-text WhatsApp message via the Cloud API.
 */
export async function sendWaMessage(to: string, text: string): Promise<WaSendResult> {
  const cfg = await getWaConfig()
  const url = `${GRAPH_BASE}/${cfg.phoneNumberId}/messages`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) {
    const msg = json?.error?.message || `HTTP ${resp.status}`
    return { status: 'error', messageId: null, error: msg }
  }

  return { status: 'ok', messageId: json.messages?.[0]?.id ?? null }
}

// ─── Send template ────────────────────────────────────────────────────────────

export interface WaSendTemplateParams {
  to: string
  templateName: string
  languageCode: string
  bodyParams?: string[]
}

/**
 * Send a WhatsApp HSM (template) message via the Cloud API.
 * `bodyParams` maps to the BODY component's text parameters (in order).
 */
export async function sendWaTemplate(params: WaSendTemplateParams): Promise<WaSendResult> {
  const { to, templateName, languageCode, bodyParams = [] } = params
  const cfg = await getWaConfig()
  const url = `${GRAPH_BASE}/${cfg.phoneNumberId}/messages`

  const components: any[] = []
  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((text) => ({ type: 'text', text })),
    })
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 && { components }),
      },
    }),
  })

  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) {
    const msg = json?.error?.message || `HTTP ${resp.status}`
    return { status: 'error', messageId: null, error: msg }
  }

  return { status: 'ok', messageId: json.messages?.[0]?.id ?? null }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTAGRAM
// ═══════════════════════════════════════════════════════════════════════════
//
// Config stored in Supabase settings (category = 'instagram'):
//   instagram.accessToken  — Page access token
//   instagram.pageId       — Facebook Page ID (used for Messenger API for IG)
//   instagram.igUserId     — Instagram Business Account user ID (for IG Graph API)
//
// Conversations/Messages use the Messenger Platform API (/{pageId}/...)
// Profile uses the IG Graph API (/{igUserId}?fields=...)

interface IgConfig {
  accessToken: string  // user access token (or page token if already stored as such)
  pageToken: string    // page access token — required for /conversations?platform=instagram
  pageId: string
  igUserId: string
}

let _igConfigCache: IgConfig | null = null
let _igConfigCacheAt = 0
const IG_CONFIG_TTL_MS = 5 * 60 * 1000

/**
 * Exchanges a User Access Token for a Page Access Token.
 * Required because /{pageId}/conversations?platform=instagram only accepts Page ATs.
 * If the stored token is already a Page AT, this call still works and returns the same/refreshed token.
 */
async function exchangeForPageToken(userToken: string, pageId: string): Promise<string> {
  try {
    const url = `${GRAPH_BASE}/${pageId}?fields=access_token`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` } })
    const json: any = await resp.json().catch(() => ({}))
    if (resp.ok && json.access_token) {
      console.info('[exchangeForPageToken] ✅ Page token obtained successfully')
      return json.access_token
    }
    console.warn('[exchangeForPageToken] ❌ Could not exchange token:', JSON.stringify(json))
  } catch (e) {
    console.warn('[exchangeForPageToken] ❌ Exchange failed:', e)
  }
  console.warn('[exchangeForPageToken] Using original token as fallback')
  return userToken
}


async function getIgConfig(): Promise<IgConfig> {
  const now = Date.now()
  if (_igConfigCache && now - _igConfigCacheAt < IG_CONFIG_TTL_MS) return _igConfigCache

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('category', 'instagram')
    .in('key', ['instagram.accessToken', 'instagram.pageId', 'instagram.igUserId'])

  if (error) throw new Error(`Supabase settings read error: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value ?? ''

  const accessToken = map['instagram.accessToken'] ?? ''
  const pageId = map['instagram.pageId'] ?? ''

  if (!accessToken || !pageId) {
    throw new Error('Instagram credentials not configured in Supabase settings.')
  }

  const pageToken = await exchangeForPageToken(accessToken, pageId)

  const cfg: IgConfig = {
    accessToken,
    pageToken,
    pageId,
    igUserId: map['instagram.igUserId'] ?? '',
  }

  _igConfigCache = cfg
  _igConfigCacheAt = now
  return cfg
}

export function invalidateIgConfigCache(): void {
  _igConfigCache = null
  _igConfigCacheAt = 0
}

// ─── IG response types ────────────────────────────────────────────────────────

export interface IgConversation {
  id: string
  participantId: string
  participantUsername: string
  participantName: string
  lastMessage: string
  lastAt: string
}

export interface IgMessage {
  id: string
  content: string
  direction: 'incoming' | 'outgoing'
  createdTime: string
}

// ─── IG public API ─────────────────────────────────────────────────────────────

export async function getIgProfile() {
  const cfg = await getIgConfig()
  if (!cfg.igUserId) throw new Error('instagram.igUserId not configured')
  const fields = 'id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count'
  const url = `${GRAPH_BASE}/${cfg.igUserId}?fields=${fields}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) throw new Error(json?.error?.message || `HTTP ${resp.status}`)
  return json
}

export async function listIgConversations(limit = 10, after?: string): Promise<{ data: IgConversation[]; nextCursor: string | null }> {
  const cfg = await getIgConfig()

  const fields = 'id,participants{id,name},updated_time'
  const qs = new URLSearchParams({ fields, limit: String(limit) })
  if (after) qs.set('after', after)
  const url = `${GRAPH_BASE}/${cfg.igUserId}/conversations?${qs}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) {
    console.error('[listIgConversations] API error:', JSON.stringify(json))
    throw new Error(json?.error?.message || `HTTP ${resp.status}`)
  }

  const igUserId = cfg.igUserId
  const convData: IgConversation[] = (Array.isArray(json.data) ? json.data : []).map((c: any) => {
    const participants: any[] = c.participants?.data ?? []
    const other = participants.find((p: any) => p.id !== igUserId) ?? participants[0] ?? {}
    return {
      id: c.id ?? '',
      participantId: other.id ?? '',
      participantUsername: other.name ?? '',
      participantName: other.name ?? '',
      lastMessage: '',
      lastAt: c.updated_time ?? '',
    }
  })

  return { data: convData, nextCursor: json.paging?.cursors?.after ?? null }
}

export async function getIgMessages(threadId: string, limit = 50): Promise<IgMessage[]> {
  const cfg = await getIgConfig()
  const fields = 'id,message,from,created_time'
  const qs = new URLSearchParams({ fields, limit: String(limit) })
  const url = `${GRAPH_BASE}/${threadId}/messages?${qs}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${cfg.pageToken}` } })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) throw new Error(json?.error?.message || `HTTP ${resp.status}`)

  const igUserId = cfg.igUserId
  return (Array.isArray(json.data) ? json.data : []).map((m: any) => ({
    id: m.id ?? '',
    content: m.message ?? '',
    direction: (m.from?.id === igUserId ? 'outgoing' : 'incoming') as 'incoming' | 'outgoing',
    createdTime: m.created_time ?? '',
  }))
}

export async function sendIgDM(recipientId: string, text: string): Promise<WaSendResult> {
  const cfg = await getIgConfig()
  const url = `${GRAPH_BASE}/${cfg.pageId}/messages`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.pageToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
    }),
  })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) return { status: 'error', messageId: null, error: json?.error?.message || `HTTP ${resp.status}` }
  return { status: 'ok', messageId: json.message_id ?? null }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACEBOOK
// ═══════════════════════════════════════════════════════════════════════════
//
// Config stored in Supabase settings (category = 'facebook'):
//   facebook.accessToken  — Page access token
//   facebook.pageId       — Facebook Page ID

interface FbConfig {
  accessToken: string
  pageId: string
}

let _fbConfigCache: FbConfig | null = null
let _fbConfigCacheAt = 0
const FB_CONFIG_TTL_MS = 5 * 60 * 1000

async function getFbConfig(): Promise<FbConfig> {
  const now = Date.now()
  if (_fbConfigCache && now - _fbConfigCacheAt < FB_CONFIG_TTL_MS) return _fbConfigCache

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('category', 'facebook')
    .in('key', ['facebook.accessToken', 'facebook.pageId'])

  if (error) throw new Error(`Supabase settings read error: ${error.message}`)

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value ?? ''

  const cfg: FbConfig = {
    accessToken: map['facebook.accessToken'] ?? '',
    pageId: map['facebook.pageId'] ?? '',
  }

  if (!cfg.accessToken || !cfg.pageId) {
    throw new Error('Facebook credentials not configured in Supabase settings.')
  }

  _fbConfigCache = cfg
  _fbConfigCacheAt = now
  return cfg
}

export function invalidateFbConfigCache(): void {
  _fbConfigCache = null
  _fbConfigCacheAt = 0
}

// ─── FB response types ────────────────────────────────────────────────────────

export interface FbConversationItem {
  id: string
  senderPsid: string
  senderName: string
  updatedTime: string
}

export interface FbMessage {
  id: string
  content: string
  direction: 'incoming' | 'outgoing'
  createdTime: string
}

// ─── FB public API ─────────────────────────────────────────────────────────────

export async function getFbPage() {
  const cfg = await getFbConfig()
  const fields = 'id,name,fan_count,followers_count,picture{url}'
  const url = `${GRAPH_BASE}/${cfg.pageId}?fields=${fields}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) throw new Error(json?.error?.message || `HTTP ${resp.status}`)
  return json
}

export async function listFbConversations(): Promise<FbConversationItem[]> {
  const cfg = await getFbConfig()
  const fields = 'id,senders{id,name},updated_time'
  const url = `${GRAPH_BASE}/${cfg.pageId}/conversations?fields=${fields}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) throw new Error(json?.error?.message || `HTTP ${resp.status}`)

  return (Array.isArray(json.data) ? json.data : []).map((c: any) => {
    const sender = c.senders?.data?.[0] ?? {}
    return {
      id: c.id ?? '',
      senderPsid: sender.id ?? '',
      senderName: sender.name ?? '',
      updatedTime: c.updated_time ?? '',
    }
  })
}

export async function getFbMessages(threadId: string, limit = 200): Promise<FbMessage[]> {
  const cfg = await getFbConfig()
  const fields = 'id,message,from,created_time'
  const qs = new URLSearchParams({ fields, limit: String(limit) })
  const url = `${GRAPH_BASE}/${threadId}/messages?${qs}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) throw new Error(json?.error?.message || `HTTP ${resp.status}`)

  return (Array.isArray(json.data) ? json.data : []).map((m: any) => ({
    id: m.id ?? '',
    content: m.message ?? '',
    direction: (m.from?.id === cfg.pageId ? 'outgoing' : 'incoming') as 'incoming' | 'outgoing',
    createdTime: m.created_time ?? '',
  }))
}

export async function sendFbMessage(
  recipientPsid: string,
  text: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'file' | 'audio' | 'video',
): Promise<WaSendResult> {
  const cfg = await getFbConfig()
  const url = `${GRAPH_BASE}/${cfg.pageId}/messages`

  const message: any = {}
  if (text) message.text = text
  if (mediaUrl) {
    message.attachment = { type: mediaType || 'image', payload: { url: mediaUrl, is_reusable: true } }
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientPsid }, message, messaging_type: 'RESPONSE' }),
  })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok || json.error) return { status: 'error', messageId: null, error: json?.error?.message || `HTTP ${resp.status}` }
  return { status: 'ok', messageId: json.message_id ?? null }
}
