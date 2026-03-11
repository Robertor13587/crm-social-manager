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
const WF_ID = '6b6820a7T7ewN85D'

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
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, payload: buf.toString('utf8') })
        }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

(async () => {
  if (!API_KEY) {
    console.error('Missing N8N_API_KEY in .env.local')
    process.exit(1)
  }
  const get = await request('GET', `/api/v1/workflows/${WF_ID}`)
  const w = get.payload
  const nodes = w.nodes || []
  const find = (name) => nodes.find((n) => n.name === name)
  const ret = find('Return JSON')
  const mysql = find('MySQL - Get Messages')
  const extract = find('Extract Params')
  if (ret) {
    ret.parameters = ret.parameters || {}
    ret.parameters.jsCode = 'const rows = $input.all().map(i => i.json); return [{ json: { status: "ok", count: rows.length, messages: rows } }];'
  }
  if (mysql) {
    mysql.parameters = mysql.parameters || {}
    // Remove non-schema option to avoid 400 on update
    // mysql.options = Object.assign({}, mysql.options || {}, { continueOnFail: true })
    mysql.parameters.query = "{{ \n  $json.phone || $json.phone_digits\n    ? `SELECT * FROM wa_messages \n       WHERE (from_phone = '${$json.phone ?? ''}' OR to_phone = '${$json.phone ?? ''}')\n          OR (from_phone = '${$json.phone_digits ?? ''}' OR to_phone = '${$json.phone_digits ?? ''}')\n       ORDER BY timestamp ${$json.order === 'desc' ? 'DESC' : 'ASC'};`\n    : `SELECT * FROM wa_messages \n       ORDER BY timestamp ${$json.order === 'desc' ? 'DESC' : 'ASC'};`\n}}"
  }
  if (extract) {
    extract.parameters = extract.parameters || {}
    extract.parameters.jsCode = 'const raw = $json.query?.phone || ""; const order = ($json.query?.order || "asc").toLowerCase(); const digits = (raw || "").replace(/\\D/g, ""); const phone = raw.startsWith("+") ? raw : (digits ? "+" + digits : null); const phone_digits = digits || null; return [{ json: { phone, phone_digits, order } }];'
  }
  const payload = { name: w.name, nodes: w.nodes, connections: w.connections, settings: w.settings }
  const put = await request('PUT', `/api/v1/workflows/${WF_ID}`, payload)
  if (put.statusCode !== 200) {
    console.log(JSON.stringify({ ok: false, statusCode: put.statusCode, payload: put.payload }))
  } else {
    console.log(JSON.stringify({ ok: true, statusCode: put.statusCode }))
  }
})()
