import dotenv from 'dotenv'
import process from 'node:process'

dotenv.config({ path: '.env.local', override: true })

const WORKFLOW_ID_IG_PROFILE = 'ZT0eGQQ3WAdiXHOM'
const WORKFLOW_ID_FB_PROFILE = 'sDMvimhIQ9xzLhU5'
const WORKFLOW_ID_FB_STATS = '459mhwIKh6nUYB07'
const WORKFLOW_ID_FB_CONVERSATIONS = 'DnMQQo3pFYKxXSwr'
const WORKFLOW_ID_FB_MESSAGES = '6z0vIFXvZTRb5GE0'
const WORKFLOW_ID_FB_SEND = 'N8kYGIHEhs5IeSH8'

const publicBase = String(process.env.VITE_N8N_BASE_URL || 'https://workflow.robdev.website').replace(/\/$/, '')
const apiBase = `${publicBase}/api/v1`
const apiKey = process.env.N8N_API_KEY

if (!apiKey) {
  throw new Error('N8N_API_KEY mancante in .env.local')
}

const headers = { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' }

const getWorkflow = async (workflowId) => {
  const res = await fetch(`${apiBase}/workflows/${workflowId}`, { headers })
  const text = await res.text()
  if (!res.ok) throw new Error(`GET workflow failed: ${res.status} ${text}`)
  return JSON.parse(text)
}

const updateWorkflow = async (workflowId, wf) => {
  const res = await fetch(`${apiBase}/workflows/${workflowId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(wf)
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`PUT workflow failed: ${res.status} ${text}`)
  return JSON.parse(text)
}

const activateWorkflow = async (workflowId) => {
  try {
    await fetch(`${apiBase}/workflows/${workflowId}/activate`, { method: 'POST', headers })
  } catch {}
}

const patchProfileWorkflowInPlace = (wf, kind) => {
  const prepare = wf.nodes.find((n) => n.name === 'Prepare Request' && n.type === 'n8n-nodes-base.code')
  const http = wf.nodes.find((n) => / API – Get Profile$/.test(n.name || '') && n.type === 'n8n-nodes-base.httpRequest')
  const format = wf.nodes.find((n) => n.name === 'Format Response' && n.type === 'n8n-nodes-base.code')

  if (!prepare || !http || !format) {
    throw new Error(`Workflow ${wf.name} non ha i nodi attesi (Prepare/HTTP/Format)`)
  }

  if (kind === 'instagram') {
    prepare.parameters.jsCode = `const row = $input.first()?.json || {};\n\nfunction normalizeToken(value) {\n  let t = String(value ?? '').trim();\n  if (!t) return '';\n\n  const looksJson = /^\\s*\\{/.test(t) && t.includes('access_token');\n  if (looksJson) {\n    try {\n      const parsed = JSON.parse(t);\n      if (parsed?.access_token) t = String(parsed.access_token);\n    } catch {}\n  }\n\n  if (t.includes('access_token=')) {\n    try {\n      const last = t.split('?').slice(-1)[0];\n      const params = new URLSearchParams(last);\n      const v = params.get('access_token');\n      if (v) t = String(v);\n    } catch {}\n  }\n\n  t = String(t)\n    .trim()\n    .replace(/^Bearer\\s+/i, '')\n    .replace(/^\\\"+|\\\"+$/g, '')\n    .replace(/\\s+/g, '');\n\n  return t;\n}\n\nconst ig_user_id = String(row.IG_USER_ID || '').trim();\nconst rawToken = row.PAGE_ACCESS_TOKEN || row.IG_ACCESS_TOKEN || '';\nconst access_token = normalizeToken(rawToken);\n\nif (!ig_user_id || !access_token) {\n  return [{\n    json: {\n      status: 'error',\n      channel: 'instagram',\n      error: { code: 'MISSING_CONFIG', message: 'Missing IG_USER_ID or PAGE_ACCESS_TOKEN (fallback IG_ACCESS_TOKEN) in DataTable' },\n      debug: {\n        ig_user_id,\n        tokenLen: access_token.length,\n        rawLen: String(rawToken ?? '').length,\n        rawHasAccessTokenEq: String(rawToken ?? '').includes('access_token='),\n        rawLooksJson: /^\\s*\\{/.test(String(rawToken ?? ''))\n      }\n    }\n  }];\n}\n\nconst looksLikeMeta = /^(EAA|EAAG)/i.test(access_token);\n\nreturn [{\n  json: {\n    ig_user_id,\n    access_token,\n    debug: {\n      looksLikeMeta,\n      tokenLen: access_token.length,\n      rawLen: String(rawToken ?? '').length,\n      rawHasAccessTokenEq: String(rawToken ?? '').includes('access_token='),\n      rawLooksJson: /^\\s*\\{/.test(String(rawToken ?? ''))\n    }\n  }\n}];\n`
    format.parameters.jsCode = `function redact(input) {\n  const s = String(input || '')\n  return s\n    .replace(/access_token=([^&\\s]+)/gi, 'access_token=[REDACTED]')\n    .replace(/Bearer\\s+([A-Za-z0-9._-]+)/g, 'Bearer [REDACTED]')\n}\n\nconst raw = $json || {};\nconst debug = $node['Prepare Request']?.json?.debug ?? null;\nconst isError = Boolean(raw?.error) || String(raw?.name || '').includes('Error') || String(raw?.code || '').includes('ERR_') || String(raw?.message || '').includes('Request failed');\n\nif (isError) {\n  const status = raw?.status ?? raw?.error?.status ?? raw?.statusCode ?? null;\n  const message = redact(raw?.error?.message || raw?.message || 'Request failed');\n  return [{ json: { status: 'error', channel: 'instagram', profile: null, error: { status, message }, debug } }];\n}\n\nreturn [{ json: { status: 'ok', channel: 'instagram', profile: raw, debug } }];\n`
  } else if (kind === 'facebook') {
    prepare.parameters.jsCode = `const row = $input.first()?.json || {};\n\nconst page_id = String(row.PAGE_ID || '').trim();\nconst page_token = String(row.PAGE_ACCESS_TOKEN || '').trim().replace(/^Bearer\\s+/i, '');\n\nif (!page_id || !page_token) {\n  return [{ json: { error: { code: 'MISSING_CONFIG', message: 'Missing PAGE_ID or PAGE_ACCESS_TOKEN in DataTable' }, page_id } }];\n}\n\nreturn [{ json: { page_id, page_token } }];\n`
    format.parameters.jsCode = `function redact(input) {\n  const s = String(input || '')\n  return s\n    .replace(/access_token=([^&\\s]+)/gi, 'access_token=[REDACTED]')\n    .replace(/Bearer\\s+([A-Za-z0-9._-]+)/g, 'Bearer [REDACTED]')\n}\n\nconst raw = $json || {};\nconst isError = Boolean(raw?.error) || String(raw?.name || '').includes('Error') || String(raw?.code || '').includes('ERR_') || String(raw?.message || '').includes('Request failed');\n\nif (isError) {\n  const status = raw?.status ?? raw?.error?.status ?? raw?.statusCode ?? null;\n  const message = redact(raw?.error?.message || raw?.message || 'Request failed');\n  return [{ json: { status: 'error', channel: 'facebook', page: null, profile: null, error: { status, message } } }];\n}\n\nreturn [{ json: { status: 'ok', channel: 'facebook', page: raw, profile: raw } }];\n`
  } else {
    throw new Error(`kind non supportato: ${kind}`)
  }

  http.onError = 'continueRegularOutput'
  http.parameters.options = { ...(http.parameters.options || {}), ignoreResponseCode: true }
  if (kind === 'instagram') {
    http.parameters.sendHeaders = false
    delete http.parameters.headerParameters
    http.parameters.url =
      '=https://graph.facebook.com/v24.0/{{$json.ig_user_id}}?fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography&access_token={{$json.access_token}}'
  }

  return wf
}

const patchFacebookWorkflowInPlace = (wf, kind, sharedDataTableId) => {
  if (kind !== 'facebook') throw new Error('kind non supportato')

  const findCode = (name) => wf.nodes.find((n) => n.name === name && n.type === 'n8n-nodes-base.code')
  const findHttp = (name) => wf.nodes.find((n) => n.name === name && n.type === 'n8n-nodes-base.httpRequest')
  const findDataTable = (name) => wf.nodes.find((n) => n.name === name && n.type === 'n8n-nodes-base.dataTable')

  if (sharedDataTableId?.value) {
    const dt = findDataTable('Get FB Config')
    if (dt) dt.parameters.dataTableId = JSON.parse(JSON.stringify(sharedDataTableId))
  }

  if (wf.id === WORKFLOW_ID_FB_PROFILE) {
    const prepare = findCode('Prepare Request')
    const http = findHttp('FB API – Get Profile')
    const format = findCode('Format Response')
    if (!prepare || !http || !format) throw new Error(`Workflow ${wf.name} non ha i nodi attesi (Prepare/HTTP/Format)`)

    prepare.parameters.jsCode = `const row = $input.first()?.json || {};\n\nfunction cleanToken(t) {\n  return String(t || '')\n    .trim()\n    .replace(/^Bearer\\s+/i, '')\n    .replace(/^\\\"+|\\\"+$/g, '')\n    .replace(/\\s+/g, '')\n}\n\nasync function resolvePageToken(page_id, page_token, meta_user_token) {\n  if (!page_id || !meta_user_token) return page_token;\n  try {\n    const url = 'https://graph.facebook.com/v24.0/' + encodeURIComponent(page_id) + '?fields=access_token&access_token=' + encodeURIComponent(meta_user_token);\n    const r = await fetch(url);\n    const j = await r.json().catch(() => null);\n    const t = j?.access_token;\n    if (t) return cleanToken(t);\n  } catch {}\n  return page_token;\n}\n\nconst page_id = String(row.PAGE_ID || '').trim();\nlet page_token = cleanToken(row.PAGE_ACCESS_TOKEN || '');\nconst meta_user_token = cleanToken(row.META_USER_ACCESS_TOKEN || row.META_ACCESS_TOKEN || row.FB_USER_ACCESS_TOKEN || '');\n\npage_token = await resolvePageToken(page_id, page_token, meta_user_token);\n\nif (!page_id || !page_token) {\n  return [{ json: { error: { code: 'MISSING_CONFIG', message: 'Missing PAGE_ID or PAGE_ACCESS_TOKEN in DataTable' }, page_id } }];\n}\n\nreturn [{ json: { page_id, page_token } }];\n`

    http.onError = 'continueRegularOutput'
    http.parameters.options = { ...(http.parameters.options || {}), ignoreResponseCode: true }
    return wf
  }

  if (wf.id === WORKFLOW_ID_FB_STATS) {
    const prepare = findCode('Prepare Config')
    const http = findHttp('FB API – Get Stats')
    const format = findCode('Format Response')
    if (!prepare || !http || !format) throw new Error(`Workflow ${wf.name} non ha i nodi attesi (Prepare/HTTP/Format)`)

    prepare.parameters.jsCode = `const row = $input.first().json;\n\nfunction cleanToken(t) {\n  return String(t || '')\n    .trim()\n    .replace(/^Bearer\\s+/i, '')\n    .replace(/^\\\"+|\\\"+$/g, '')\n    .replace(/\\s+/g, '')\n}\n\nasync function resolvePageToken(page_id, page_token, meta_user_token) {\n  if (!page_id || !meta_user_token) return page_token;\n  try {\n    const url = 'https://graph.facebook.com/v24.0/' + encodeURIComponent(page_id) + '?fields=access_token&access_token=' + encodeURIComponent(meta_user_token);\n    const r = await fetch(url);\n    const j = await r.json().catch(() => null);\n    const t = j?.access_token;\n    if (t) return cleanToken(t);\n  } catch {}\n  return page_token;\n}\n\nconst pageId = String(row.PAGE_ID || '').trim();\nlet token = cleanToken(row.PAGE_ACCESS_TOKEN || row.FB_PAGE_ACCESS_TOKEN || '');\nconst meta_user_token = cleanToken(row.META_USER_ACCESS_TOKEN || row.META_ACCESS_TOKEN || row.FB_USER_ACCESS_TOKEN || '');\n\ntoken = await resolvePageToken(pageId, token, meta_user_token);\n\nif (!pageId) {\n  throw new Error('Missing PAGE_ID in DataTable config (Social CRM - Facebook).');\n}\n\nif (!token) {\n  throw new Error('Missing PAGE_ACCESS_TOKEN (or FB_PAGE_ACCESS_TOKEN) in DataTable config.');\n}\n\nreturn [{ json: { page_id: pageId, page_token: token } }];\n`

    http.onError = 'continueRegularOutput'
    http.parameters.options = { ...(http.parameters.options || {}), ignoreResponseCode: true }
    return wf
  }

  if (wf.id === WORKFLOW_ID_FB_CONVERSATIONS) {
    const prepare = findCode('Prepare Config')
    const http = findHttp('FB API - Get Conversations')
    const ret = findCode('Return JSON')
    if (!prepare || !http || !ret) throw new Error(`Workflow ${wf.name} non ha i nodi attesi (Prepare/HTTP/Return JSON)`)

    prepare.parameters.jsCode = `const rows = $input.all().map(i => i.json || {}).filter(Boolean);\nconst q = $node['Webhook FB Conversations']?.json?.query || {};\nconst accountRaw = q.account ?? q.row ?? q.index;\nconst idx = Math.max(0, Number(accountRaw || 1) - 1);\nconst row = rows[idx] || rows[0] || {};\n\nfunction cleanToken(t) {\n  return String(t || '')\n    .trim()\n    .replace(/^Bearer\\s+/i, '')\n    .replace(/^\\\"+|\\\"+$/g, '')\n    .replace(/\\s+/g, '')\n}\n\nasync function resolvePageToken(page_id, page_token, meta_user_token) {\n  if (!page_id || !meta_user_token) return page_token;\n  try {\n    const url = 'https://graph.facebook.com/v24.0/' + encodeURIComponent(page_id) + '?fields=access_token&access_token=' + encodeURIComponent(meta_user_token);\n    const r = await fetch(url);\n    const j = await r.json().catch(() => null);\n    const t = j?.access_token;\n    if (t) return cleanToken(t);\n  } catch {}\n  return page_token;\n}\n\nconst page_id = String(row.PAGE_ID ?? row.FACEBOOK_PAGE_ID ?? row.page_id ?? row.pageId ?? '').trim();\nlet page_token = cleanToken(row.PAGE_ACCESS_TOKEN ?? row.FACEBOOK_PAGE_ACCESS_TOKEN ?? row.page_token ?? row.pageToken ?? '');\nconst meta_user_token = cleanToken(row.META_USER_ACCESS_TOKEN ?? row.META_ACCESS_TOKEN ?? row.FB_USER_ACCESS_TOKEN ?? '');\n\npage_token = await resolvePageToken(page_id, page_token, meta_user_token);\n\nif (!page_id || !page_token) {\n  throw new Error('Missing PAGE_ID or PAGE_ACCESS_TOKEN in DataTable');\n}\n\nreturn [{ json: { page_id, page_token } }];\n`

    http.onError = 'continueRegularOutput'
    http.parameters.options = { ...(http.parameters.options || {}), ignoreResponseCode: true }
    return wf
  }

  if (wf.id === WORKFLOW_ID_FB_MESSAGES) {
    const prepare = findCode('Prepare Config')
    const http = findHttp('FB API – Get Messages')
    const format = findCode('Format Response')
    if (!prepare || !http || !format) throw new Error(`Workflow ${wf.name} non ha i nodi attesi (Prepare/HTTP/Format)`)

    prepare.parameters.jsCode = `const webhookData = $input.all()[0].json;\nconst fbConfig = $input.all()[1].json;\n\nfunction cleanToken(t) {\n  return String(t || '')\n    .trim()\n    .replace(/^Bearer\\s+/i, '')\n    .replace(/^\\\"+|\\\"+$/g, '')\n    .replace(/\\s+/g, '')\n}\n\nasync function resolvePageToken(page_id, page_token, meta_user_token) {\n  if (!page_id || !meta_user_token) return page_token;\n  try {\n    const url = 'https://graph.facebook.com/v24.0/' + encodeURIComponent(page_id) + '?fields=access_token&access_token=' + encodeURIComponent(meta_user_token);\n    const r = await fetch(url);\n    const j = await r.json().catch(() => null);\n    const t = j?.access_token;\n    if (t) return cleanToken(t);\n  } catch {}\n  return page_token;\n}\n\nconst thread_id = webhookData.query?.thread_id;\n\nif (!thread_id) {\n  throw new Error('Missing thread_id — thread_id era: ' + JSON.stringify(webhookData.query));\n}\n\nconst page_id = String(fbConfig.PAGE_ID || '').trim();\nlet page_token = cleanToken(fbConfig.PAGE_ACCESS_TOKEN || fbConfig.FB_PAGE_ACCESS_TOKEN || '');\nconst meta_user_token = cleanToken(fbConfig.META_USER_ACCESS_TOKEN || fbConfig.META_ACCESS_TOKEN || fbConfig.FB_USER_ACCESS_TOKEN || '');\n\npage_token = await resolvePageToken(page_id, page_token, meta_user_token);\n\nreturn [{ json: { thread_id, page_id, page_token } }];\n`

    http.onError = 'continueRegularOutput'
    http.parameters.options = { ...(http.parameters.options || {}), ignoreResponseCode: true }
    return wf
  }

  if (wf.id === WORKFLOW_ID_FB_SEND) {
    const build = findCode('Build Messages')
    const http = findHttp('FB API – Send (Unified)')
    if (!build || !http) throw new Error(`Workflow ${wf.name} non ha i nodi attesi (Build Messages/HTTP)`)

    build.parameters.jsCode = `const item = $input.first().json;\n\nfunction cleanToken(t) {\n  return String(t || '')\n    .trim()\n    .replace(/^Bearer\\s+/i, '')\n    .replace(/^\\\"+|\\\"+$/g, '')\n    .replace(/\\s+/g, '')\n}\n\nasync function resolvePageToken(page_id, page_token, meta_user_token) {\n  if (!page_id || !meta_user_token) return page_token;\n  try {\n    const url = 'https://graph.facebook.com/v24.0/' + encodeURIComponent(page_id) + '?fields=access_token&access_token=' + encodeURIComponent(meta_user_token);\n    const r = await fetch(url);\n    const j = await r.json().catch(() => null);\n    const t = j?.access_token;\n    if (t) return cleanToken(t);\n  } catch {}\n  return page_token;\n}\n\nconst recipientId = item.recipient_id;\nconst text = item.text || null;\nconst media = item.media || null;\n\nconst pageId = String(item.PAGE_ID || item.page_id || '').trim();\nlet pageToken = cleanToken(item.PAGE_ACCESS_TOKEN || item.FB_PAGE_ACCESS_TOKEN || '');\nconst meta_user_token = cleanToken(item.META_USER_ACCESS_TOKEN || item.META_ACCESS_TOKEN || item.FB_USER_ACCESS_TOKEN || '');\n\npageToken = await resolvePageToken(pageId, pageToken, meta_user_token);\n\nif (!recipientId) {\n  throw new Error('Missing recipient_id');\n}\n\nif (!pageToken) {\n  throw new Error('Missing PAGE_ACCESS_TOKEN');\n}\n\nconst messages = [];\n\nif (media && media.url) {\n  const mediaMsg = {\n    messaging_type: 'RESPONSE',\n    recipient: { id: recipientId },\n    message: {\n      attachment: {\n        type: media.type || 'image',\n        payload: {\n          url: media.url,\n          is_reusable: media.is_reusable !== undefined ? media.is_reusable : true,\n        },\n      },\n    },\n  };\n\n  messages.push({\n    json: {\n      kind: 'media',\n      recipient_id: recipientId,\n      page_token: pageToken,\n      body: mediaMsg,\n    },\n  });\n}\n\nif (text) {\n  const textMsg = {\n    messaging_type: 'RESPONSE',\n    recipient: { id: recipientId },\n    message: { text },\n  };\n\n  messages.push({\n    json: {\n      kind: 'text',\n      recipient_id: recipientId,\n      page_token: pageToken,\n      body: textMsg,\n    },\n  });\n}\n\nreturn messages;\n`

    http.onError = 'continueRegularOutput'
    http.parameters.options = { ...(http.parameters.options || {}), ignoreResponseCode: true }
    return wf
  }

  return wf
}

const main = async () => {
  const wfIg = await getWorkflow(WORKFLOW_ID_IG_PROFILE)
  const igDataTableNode = (wfIg.nodes || []).find((n) => n.type === 'n8n-nodes-base.dataTable' && n.name === 'Get IG Config')
  const sharedDataTableId = igDataTableNode?.parameters?.dataTableId || null
  patchProfileWorkflowInPlace(wfIg, 'instagram')
  await updateWorkflow(WORKFLOW_ID_IG_PROFILE, { name: wfIg.name, nodes: wfIg.nodes, connections: wfIg.connections, settings: wfIg.settings })
  await activateWorkflow(WORKFLOW_ID_IG_PROFILE)

  const fbIds = [WORKFLOW_ID_FB_PROFILE, WORKFLOW_ID_FB_STATS, WORKFLOW_ID_FB_CONVERSATIONS, WORKFLOW_ID_FB_MESSAGES, WORKFLOW_ID_FB_SEND]
  for (const id of fbIds) {
    const wf = await getWorkflow(id)
    patchFacebookWorkflowInPlace(wf, 'facebook', sharedDataTableId)
    await updateWorkflow(id, { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings })
    await activateWorkflow(id)
  }

  const endpoints = ['/webhook/crm/instagram/profile', '/webhook/crm/facebook/profile', '/webhook/crm/facebook/conversations', '/webhook/crm/meta/profile']
  const results = {}
  for (const p of endpoints) {
    const r = await fetch(`${publicBase}${p}`)
    const t = await r.text().catch(() => '')
    results[p] = { status: r.status, body: t }
  }
  console.log(
    JSON.stringify(
      {
        workflows: {
          instagram: WORKFLOW_ID_IG_PROFILE,
          facebook: {
            profile: WORKFLOW_ID_FB_PROFILE,
            stats: WORKFLOW_ID_FB_STATS,
            conversations: WORKFLOW_ID_FB_CONVERSATIONS,
            messages: WORKFLOW_ID_FB_MESSAGES,
            send: WORKFLOW_ID_FB_SEND
          }
        },
        results
      },
      null,
      2
    )
  )
}

await main()
