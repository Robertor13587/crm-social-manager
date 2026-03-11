const fs = require('fs')
const https = require('https')
const path = require('path')

function readEnvKey(k) {
  try {
    const raw = fs.readFileSync(path.resolve('.env.local'), 'utf8')
    const m = raw.match(new RegExp('^' + k + '=(.*)$', 'm'))
    return m ? m[1].trim() : ''
  } catch {
    return ''
  }
}

const BASE = readEnvKey('VITE_N8N_BASE_URL') || 'https://workflow.robdev.website'
const API_KEY = readEnvKey('N8N_API_KEY')

const WF_INCOMING = 'K2ONEUQbHkpBrN2M'
const WF_LOG = 'M35eYE2STr2d0pfI'
const WF_CONVERSATIONS = 'E7Ml2LIEwZ4C5FJY'

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE)
    const data = body ? Buffer.from(JSON.stringify(body)) : null
    const opt = {
      method,
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      protocol: u.protocol,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': data ? String(data.length) : '0'
      }
    }
    const req = https.request(opt, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        const ct = res.headers['content-type'] || ''
        const isJson = ct.includes('application/json')
        try {
          const payload = isJson ? JSON.parse(buf.toString('utf8') || '{}') : buf.toString('utf8')
          resolve({ statusCode: res.statusCode || 0, payload })
        } catch {
          resolve({ statusCode: res.statusCode || 0, payload: buf.toString('utf8') })
        }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function getWorkflow(id) {
  const r = await request('GET', `/api/v1/workflows/${id}`)
  if (r.statusCode !== 200) throw new Error(`GET workflow failed: ${id} ${r.statusCode}`)
  return r.payload
}

async function putWorkflow(id, wf) {
  const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }
  const r = await request('PUT', `/api/v1/workflows/${id}`, payload)
  if (r.statusCode !== 200) throw new Error(`PUT workflow failed: ${id} ${r.statusCode} ${JSON.stringify(r.payload).slice(0, 400)}`)
}

async function activateWorkflow(id) {
  try {
    await request('POST', `/api/v1/workflows/${id}/activate`)
  } catch {}
}

function patchMessageLog(wf) {
  const nodes = wf.nodes || []
  const norm = nodes.find((n) => n.name === 'Normalize Payload' && n.type === 'n8n-nodes-base.code')
  const mysql = nodes.find((n) => n.name === 'MySQL – Insert WA Message' && n.type === 'n8n-nodes-base.mySql')

  if (!norm || !mysql) throw new Error('WA - Message Log: missing expected nodes')

  norm.parameters.jsCode = `const body = $json.body || $json;\n\nfunction toStr(v) {\n  if (v === undefined || v === null) return null;\n  const s = String(v).trim();\n  return s.length ? s : null;\n}\n\nfunction normalizePhone(raw) {\n  const s = toStr(raw);\n  if (!s) return null;\n  const digits = s.replace(/\\D/g, '');\n  if (!digits) return null;\n  return digits.startsWith('00') ? ('+' + digits.slice(2)) : (digits.startsWith('39') && digits.length >= 11 ? ('+' + digits) : ('+' + digits));\n}\n\nfunction toMysqlDatetime(input) {\n  if (input === undefined || input === null) return null;\n  const s = String(input).trim();\n  if (!s) return null;\n  if (/^\\d+$/.test(s)) {\n    const n = Number(s);\n    const ms = s.length >= 13 ? n : n * 1000;\n    return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');\n  }\n  if (s.includes('T')) return s.slice(0, 19).replace('T', ' ');\n  if (/^\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2}$/.test(s)) return s;\n  const d = new Date(s);\n  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace('T', ' ');\n  return null;\n}\n\nfunction escapeSqlString(s) {\n  return String(s)\n    .replace(/\\\\/g, '\\\\\\\\')\n    .replace(/\\u0000/g, '\\\\0')\n    .replace(/\\n/g, '\\\\n')\n    .replace(/\\r/g, '\\\\r')\n    .replace(/\\t/g, '\\\\t')\n    .replace(/\\x1a/g, '\\\\Z')\n    .replace(/'/g, \"\\\\'\");\n}\n\nfunction sqlLiteral(v) {\n  if (v === undefined || v === null) return 'NULL';\n  const s = String(v);\n  if (!s.trim().length) return 'NULL';\n  return \"'\" + escapeSqlString(s) + \"'\";\n}\n\nconst allowedStatus = new Set(['sent', 'delivered', 'read', 'failed']);\n\nconst wa_id = toStr(body.wa_id);\nconst directionRaw = String(body.direction || '').toLowerCase().trim();\nconst statusRaw = String(body.status || '').toLowerCase().trim();\n\nconst from_phone = normalizePhone(body.from_phone);\nconst to_phone = normalizePhone(body.to_phone);\n\nlet direction = directionRaw === 'incoming' || directionRaw === 'outgoing' ? directionRaw : null;\n\nconst message = toStr(body.message);\nconst status = allowedStatus.has(statusRaw) ? statusRaw : null;\n\nconst ts = toMysqlDatetime(body.timestamp) || toMysqlDatetime(body.ts) || toMysqlDatetime(body.created_at) || new Date().toISOString().slice(0, 19).replace('T', ' ');\nconst status_ts = toMysqlDatetime(body.status_timestamp) || toMysqlDatetime(body.status_ts) || (status ? toMysqlDatetime(body.timestamp) : null);\n\nif (!direction) direction = status && !message ? 'outgoing' : 'incoming';\n\nreturn [{\n  json: {\n    wa_id,\n    from_phone,\n    to_phone,\n    direction,\n    message,\n    ts,\n    status,\n    status_ts,\n    wa_id_sql: sqlLiteral(wa_id),\n    from_phone_sql: sqlLiteral(from_phone),\n    to_phone_sql: sqlLiteral(to_phone),\n    direction_sql: sqlLiteral(direction),\n    message_sql: sqlLiteral(message),\n    ts_sql: sqlLiteral(ts),\n    status_sql: sqlLiteral(status),\n    status_ts_sql: sqlLiteral(status_ts),\n  }\n}];\n`

  const jsCode = [
    'const body = $json.body || $json;',
    '',
    'function toStr(v) {',
    '  if (v === undefined || v === null) return null;',
    '  const s = String(v).trim();',
    '  return s.length ? s : null;',
    '}',
    '',
    'function normalizePhone(raw) {',
    '  const s = toStr(raw);',
    '  if (!s) return null;',
    '  const digits = s.replace(/\\D/g, "");',
    '  if (!digits) return null;',
    '  if (digits.startsWith("00")) return "+" + digits.slice(2);',
    '  return "+" + digits;',
    '}',
    '',
    'function toMysqlDatetime(input) {',
    '  if (input === undefined || input === null) return null;',
    '  const s = String(input).trim();',
    '  if (!s) return null;',
    '  if (/^\\d+$/.test(s)) {',
    '    const n = Number(s);',
    '    const ms = s.length >= 13 ? n : n * 1000;',
    '    return new Date(ms).toISOString().slice(0, 19).replace("T", " ");',
    '  }',
    '  if (s.includes("T")) return s.slice(0, 19).replace("T", " ");',
    '  if (/^\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2}$/.test(s)) return s;',
    '  const d = new Date(s);',
    '  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace("T", " ");',
    '  return null;',
    '}',
    '',
    'function escapeSqlString(s) {',
    '  return String(s)',
    '    .replace(/\\\\/g, "\\\\\\\\")',
    '    .replace(/\\u0000/g, "\\\\0")',
    '    .replace(/\\n/g, "\\\\n")',
    '    .replace(/\\r/g, "\\\\r")',
    '    .replace(/\\t/g, "\\\\t")',
    '    .replace(/\\x1a/g, "\\\\Z")',
    '    .replace(/\'/g, "\\\\\'");',
    '}',
    '',
    'function sqlLiteral(v) {',
    '  if (v === undefined || v === null) return "NULL";',
    '  const s = String(v);',
    '  if (!s.trim().length) return "NULL";',
    '  return "\'" + escapeSqlString(s) + "\'";',
    '}',
    '',
    'function pickWaId(b) {',
    '  const direct = toStr(b.wa_id) || toStr(b.id) || toStr(b.message_id) || toStr(b.wamid);',
    '  if (direct) return direct;',
    '  const msgId = toStr(b?.data?.message_id) || toStr(b?.data?.id);',
    '  if (msgId) return msgId;',
    '  const apiMsg = Array.isArray(b?.messages) ? b.messages[0] : null;',
    '  const apiMsgId = toStr(apiMsg?.id);',
    '  if (apiMsgId) return apiMsgId;',
    '  const api2Msg = Array.isArray(b?.data?.messages) ? b.data.messages[0] : null;',
    '  const api2MsgId = toStr(api2Msg?.id);',
    '  if (api2MsgId) return api2MsgId;',
    '  return null;',
    '}',
    '',
    'function inferDirection(b) {',
    '  const raw = String(b.direction || b.type || "").toLowerCase().trim();',
    '  if (raw === "incoming" || raw === "outgoing") return raw;',
    '  if (raw.includes("in")) return "incoming";',
    '  if (raw.includes("out")) return "outgoing";',
    '  const hasStatus = String(b.status || "").trim().length > 0;',
    '  if (hasStatus) return "outgoing";',
    '  return "incoming";',
    '}',
    '',
    'const allowedStatus = new Set(["sent", "delivered", "read", "failed"]);',
    '',
    'const wa_id = pickWaId(body);',
    'const direction = inferDirection(body);',
    'const statusRaw = String(body.status || "").toLowerCase().trim();',
    'let status = allowedStatus.has(statusRaw) ? statusRaw : null;',
    '',
    'let from_phone = normalizePhone(body.from_phone || body.from || body.sender || body.sender_phone || null);',
    'let to_phone = normalizePhone(body.to_phone || body.to || body.phone || body.recipient_id || body.recipient || body.contact_phone || null);',
    '',
    'if (direction === "outgoing") {',
    '  if (!to_phone && from_phone) to_phone = from_phone;',
    '  if (from_phone && to_phone && from_phone === to_phone) from_phone = null;',
    '} else {',
    '  if (!from_phone && to_phone) from_phone = to_phone;',
    '  if (from_phone && to_phone && from_phone === to_phone) to_phone = null;',
    '}',
    '',
    'const message = toStr(body.message ?? body.content ?? body.text ?? body.body ?? null);',
    'const timestamp = toMysqlDatetime(body.timestamp ?? body.created_at ?? body.time ?? Date.now());',
    'let status_timestamp = toMysqlDatetime(body.status_timestamp ?? body.status_time ?? (status ? body.timestamp : null) ?? null);',
    '',
    'if (status && !status_timestamp) status_timestamp = timestamp;',
    '',
    'return [{',
    '  json: {',
    '    wa_id,',
    '    from_phone,',
    '    to_phone,',
    '    direction,',
    '    message,',
    '    timestamp,',
    '    status,',
    '    status_timestamp,',
    '',
    '    wa_id_sql: sqlLiteral(wa_id),',
    '    from_phone_sql: sqlLiteral(from_phone),',
    '    to_phone_sql: sqlLiteral(to_phone),',
    '    direction_sql: sqlLiteral(direction),',
    '    message_sql: sqlLiteral(message),',
    '    ts_sql: sqlLiteral(timestamp),',
    '    status_sql: sqlLiteral(status),',
    '    status_ts_sql: sqlLiteral(status_timestamp),',
    '  }',
    '}];',
  ].join('\\n')
  norm.parameters.jsCode = jsCode

  mysql.parameters.operation = 'executeQuery'
  mysql.parameters.query = `CALL sp_wa_log_message(\n  {{$json.wa_id_sql}},\n  {{$json.from_phone_sql}},\n  {{$json.to_phone_sql}},\n  {{$json.direction_sql}},\n  {{$json.message_sql}},\n  {{$json.status_sql}},\n  {{$json.ts_sql}},\n  {{$json.status_ts_sql}},\n  'n8n'\n);\n`

  mysql.onError = 'continueRegularOutput'
  mysql.parameters.options = { ...(mysql.parameters.options || {}), ignoreResponseCode: true }
  return wf
}

function patchIncoming(wf) {
  const nodes = wf.nodes || []
  const parse = nodes.find((n) => n.name === 'Parse WA Event' && n.type === 'n8n-nodes-base.code')
  const save = nodes.find((n) => n.name === 'MySQL - Save Incoming' && n.type === 'n8n-nodes-base.mySql')
  const build = nodes.find((n) => n.name === 'Build Log Payload (WA Inbound)' && n.type === 'n8n-nodes-base.code')
  const http = nodes.find((n) => n.name === 'HTTP – Log WA Message (Incoming)' && n.type === 'n8n-nodes-base.httpRequest')
  const ok = nodes.find((n) => n.name === 'Return OK' && n.type === 'n8n-nodes-base.code')
  const wh = nodes.find((n) => n.name === 'Webhook - WA Incoming (POST)' && n.type === 'n8n-nodes-base.webhook')

  if (!parse || !build || !http || !ok || !wh) throw new Error('WA - Incoming (POST): missing expected nodes')

  parse.parameters.jsCode = `const entry = $json.body?.entry?.[0];\nif (!entry) return [];\n\nconst change = entry.changes?.[0];\nconst value = change?.value;\nif (!value) return [];\n\nfunction toE164(raw) {\n  const s = String(raw ?? '').trim();\n  if (!s) return null;\n  const d = s.replace(/\\D/g, '');\n  if (!d) return null;\n  return '+' + d;\n}\n\nfunction toMysqlDatetime(input) {\n  if (input === undefined || input === null) return null;\n  const s = String(input).trim();\n  if (!s) return null;\n  if (/^\\d+$/.test(s)) {\n    const n = Number(s);\n    const ms = s.length >= 13 ? n : n * 1000;\n    return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');\n  }\n  if (s.includes('T')) return s.slice(0, 19).replace('T', ' ');\n  const d = new Date(s);\n  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace('T', ' ');\n  return null;\n}\n\nconst business = toE164(value.metadata?.display_phone_number || null);\n\nconst out = [];\n\nconst msgs = Array.isArray(value.messages) ? value.messages : [];\nfor (const m of msgs) {\n  const from_phone = toE164(m.from);\n  const to_phone = business;\n  const text = m.text?.body || m.image?.caption || m.audio?.caption || m.document?.caption || m.video?.caption || null;\n  const ts = toMysqlDatetime(m.timestamp) || toMysqlDatetime(Date.now());\n  out.push({ json: { wa_id: m.id || null, from_phone, to_phone, direction: 'incoming', message: text, timestamp: ts } });\n}\n\nconst statuses = Array.isArray(value.statuses) ? value.statuses : [];\nfor (const s of statuses) {\n  const from_phone = business;\n  const to_phone = toE164(s.recipient_id);\n  const status = String(s.status || '').toLowerCase().trim() || null;\n  const status_timestamp = toMysqlDatetime(s.timestamp) || null;\n  if (!s.id) continue;\n  out.push({ json: { wa_id: s.id, from_phone, to_phone, direction: 'outgoing', status, status_timestamp } });\n}\n\nreturn out;\n`

  build.parameters.jsCode = `const item = $json;\nreturn [{\n  json: {\n    wa_id: item.wa_id ?? null,\n    from_phone: item.from_phone ?? null,\n    to_phone: item.to_phone ?? null,\n    direction: item.direction ?? (item.status ? 'outgoing' : 'incoming'),\n    message: item.message ?? null,\n    timestamp: item.timestamp ?? null,\n    status: item.status ?? null,\n    status_timestamp: item.status_timestamp ?? null,\n  }\n}];\n`

  if (save) save.disabled = true

  wf.connections = wf.connections || {}
  wf.connections['Parse WA Event'] = { main: [[{ node: 'Build Log Payload (WA Inbound)', type: 'main', index: 0 }]] }
  wf.connections['Build Log Payload (WA Inbound)'] = { main: [[{ node: 'HTTP – Log WA Message (Incoming)', type: 'main', index: 0 }]] }
  wf.connections['HTTP – Log WA Message (Incoming)'] = { main: [[{ node: 'Return OK', type: 'main', index: 0 }]] }

  if (wf.connections['MySQL - Save Incoming']) delete wf.connections['MySQL - Save Incoming']
  if (wh && wh.parameters) {
    wh.parameters.responseMode = wh.parameters.responseMode || 'lastNode'
  }

  return wf
}

function patchConversations(wf) {
  const nodes = wf.nodes || []
  const merge = nodes.find((n) => n.name === 'Merge Count + List' && n.type === 'n8n-nodes-base.merge')
  if (!merge) throw new Error('WA - List Conversations: missing Merge Count + List node')
  merge.parameters = merge.parameters || {}
  merge.parameters.mode = 'combine'
  merge.parameters.combinationMode = 'multiplex'
  return wf
}

function patchOutgoingLogHttpNodes(wf) {
  const nodes = wf.nodes || []
  for (const n of nodes) {
    if (n.type !== 'n8n-nodes-base.httpRequest') continue
    const url = String(n.parameters?.url || '')
    if (!url.includes('/webhook/internal/whatsapp/message/log')) continue
    n.parameters = n.parameters || {}
    n.parameters.method = 'POST'
    n.parameters.sendBody = true
    n.parameters.specifyBody = 'json'
    n.parameters.jsonBody = '={{ $json }}'
    n.parameters.options = n.parameters.options || {}
  }
  return wf
}

async function main() {
  if (!API_KEY) {
    console.error('Missing N8N_API_KEY in .env.local')
    process.exit(1)
  }

  const logWf = await getWorkflow(WF_LOG)
  patchMessageLog(logWf)
  await putWorkflow(WF_LOG, logWf)
  await activateWorkflow(WF_LOG)

  const incomingWf = await getWorkflow(WF_INCOMING)
  patchIncoming(incomingWf)
  await putWorkflow(WF_INCOMING, incomingWf)
  await activateWorkflow(WF_INCOMING)

  const convWf = await getWorkflow(WF_CONVERSATIONS)
  patchConversations(convWf)
  await putWorkflow(WF_CONVERSATIONS, convWf)
  await activateWorkflow(WF_CONVERSATIONS)

  for (const id of ['J8E6e3Uigrblj2OS', 'Oah3CD5HUA4PyBnQ', 'UOqHxkuKLQmDspez']) {
    try {
      const wf = await getWorkflow(id)
      patchOutgoingLogHttpNodes(wf)
      await putWorkflow(id, wf)
      await activateWorkflow(id)
    } catch {}
  }

  console.log(JSON.stringify({ ok: true, workflows: { log: WF_LOG, incoming: WF_INCOMING, conversations: WF_CONVERSATIONS } }, null, 2))
}

main().catch((e) => {
  console.error(String(e?.stack || e?.message || e))
  process.exit(1)
})
