<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">Analytics & Report</h1>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="rangePreset" class="input-field w-full sm:w-40">
          <option value="7d">7 giorni</option>
          <option value="30d">30 giorni</option>
          <option value="90d">90 giorni</option>
          <option value="q">Trimestre</option>
          <option value="custom">Personalizzato</option>
        </select>
        <div v-if="rangePreset==='custom'" class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input v-model="customStart" type="date" class="input-field" />
          <input v-model="customEnd" type="date" class="input-field" />
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" v-model="compareMode" />
          <span>Confronta periodo</span>
        </label>
        <button class="btn-secondary" @click="exportCsv">
          <Download class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">Esporta CSV</span>
        </button>
        <button class="btn-secondary" @click="printPdf">
          <FileText class="w-4 h-4 sm:mr-2" />
          <span class="hidden sm:inline">Stampa PDF</span>
        </button>
      </div>
    </div>

    <div v-if="alertMessage" class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-yellow-800">{{ alertMessage }}</span>
        <button class="text-sm text-yellow-700" @click="alertMessage=''">Chiudi</button>
      </div>
    </div>
    <div v-if="noData" class="bg-blue-50 border border-blue-200 rounded-md p-3">
      <div class="flex items-center justify-between">
        <span class="text-sm text-blue-800">nessun dato disponibile per il periodo selezionato</span>
        <button class="text-sm text-blue-700" @click="rangePreset='30d'">Resetta filtri</button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AnalyticsCard 
        title="Messaggi Totali"
        :value="kpi.total_messages"
        :change="kpiDelta.total_messages"
        icon="MessageSquare"
        color="blue"
      />
      <AnalyticsCard 
        title="Conversazioni"
        :value="kpi.total_conversations"
        :change="kpiDelta.total_conversations"
        icon="Users"
        color="green"
      />
      <AnalyticsCard 
        title="Messaggi Inbound"
        :value="kpi.inbound_messages"
        :change="kpiDelta.inbound_messages"
        icon="Clock"
        color="purple"
      />
      <AnalyticsCard 
        title="Messaggi Outbound"
        :value="kpi.outbound_messages"
        :change="kpiDelta.outbound_messages"
        icon="TrendingUp"
        color="orange"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xl font-semibold text-gray-900">Andamento Messaggi</h2>
        </div>
        <div v-if="messagesTrend.length" class="relative h-64 bg-gray-50 rounded-lg">
          <svg :width="width" :height="height" class="absolute inset-0">
            <polyline :points="linePoints(messagesTrend)" fill="none" stroke="#2563eb" stroke-width="2" />
            <polyline v-if="compareMode && messagesTrendPrev.length" :points="linePoints(messagesTrendPrev)" fill="none" stroke="#9ca3af" stroke-dasharray="4 2" stroke-width="2" />
            <g>
              <circle v-for="p in points(messagesTrend)" :key="'m'+p.x" :cx="p.x" :cy="p.y" r="3" fill="#2563eb" @mouseenter="showTip(p.label, $event)" @mouseleave="hideTip" />
            </g>
          </svg>
          <div v-if="tooltip.visible" :style="{ left: tooltip.x+'px', top: tooltip.y+'px' }" class="absolute z-10 bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow">{{ tooltip.text }}</div>
        </div>
        <div v-else class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-500">nessun dato disponibile</span>
        </div>
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Conversazioni per Data</h2>
        <div v-if="conversationsTrend.length" class="relative h-64 bg-gray-50 rounded-lg">
          <svg :width="width" :height="height" class="absolute inset-0">
            <g>
              <rect v-for="(v,i) in barSeries(conversationsTrend)" :key="'b'+i" :x="v.x" :y="v.y" :width="v.w" :height="v.h" fill="#10b981" @mouseenter="showTip(v.label, $event)" @mouseleave="hideTip" />
            </g>
          </svg>
          <div v-if="tooltip.visible" :style="{ left: tooltip.x+'px', top: tooltip.y+'px' }" class="absolute z-10 bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow">{{ tooltip.text }}</div>
        </div>
        <div v-else class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <span class="text-sm text-gray-500">nessun dato disponibile</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-900 mb-3">Distribuzione Piattaforme</h2>
        <div class="relative h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <template v-if="platformPerc.whatsapp || platformPerc.instagram || platformPerc.facebook">
            <svg :width="200" :height="200">
              <g transform="translate(100,100)">
                <path :d="pieArc(platformPerc.whatsapp, 0)" fill="#22c55e" />
                <path :d="pieArc(platformPerc.instagram, platformPerc.whatsapp)" fill="#ec4899" />
                <path :d="pieArc(platformPerc.facebook, platformPerc.whatsapp+platformPerc.instagram)" fill="#2563eb" />
              </g>
            </svg>
            <div class="absolute bottom-3 left-3 text-xs text-gray-600">WhatsApp {{ platformPerc.whatsappLabel }} • Instagram {{ platformPerc.instagramLabel }} • Facebook {{ platformPerc.facebookLabel }}</div>
          </template>
          <template v-else>
            <span class="text-sm text-gray-500">nessun dato disponibile</span>
          </template>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xl font-semibold text-gray-900">Performance Team</h2>
          <input v-model="teamQuery" class="input-field w-40" placeholder="Filtra agente" />
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" @click="sortBy('name')">Agente</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" @click="sortBy('messages')">Messaggi</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" @click="sortBy('conversations')">Conversazioni</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo Risposta</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Soddisfazione</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="!filteredTeam.length">
                <td colspan="5" class="px-6 py-10 text-center text-sm text-gray-500">nessun dato disponibile</td>
              </tr>
              <tr v-for="agent in filteredTeam" :key="agent.user.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                      <User class="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ agent.user.name }}</div>
                      <div class="text-sm text-gray-500">{{ agent.user.role }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ agent.metrics.total_messages }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ agent.metrics.total_conversations }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ agent.metrics.avg_messages_per_conversation }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div class="bg-green-500 h-2 rounded-full" :style="{ width: satisfaction(agent) + '%' }"></div>
                    </div>
                    <span class="text-sm text-gray-900">{{ satisfaction(agent) }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">Genera Report</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button class="btn-secondary w-full" @click="printPdf">
          <FileText class="w-4 h-4 mr-2" />
          Report PDF
        </button>
        <button class="btn-secondary w-full" @click="exportCsv">
          <Download class="w-4 h-4 mr-2" />
          Export CSV
        </button>
        <button class="btn-secondary w-full" @click="sendReportEmail">
          <Mail class="w-4 h-4 mr-2" />
          Invia Email
        </button>
      </div>
    </div>
  </div>
  </template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { Download, FileText, Mail, User } from 'lucide-vue-next'
import AnalyticsCard from '@/components/analytics/AnalyticsCard.vue'
import { useToast } from '@/composables/useToast'

const { showToast } = useToast()

const logEvent = (action: string, payload: Record<string, any> = {}) => {
  const entry = { action, payload, at: new Date().toISOString() }
  try {
    const raw = localStorage.getItem('analyticsLog')
    const list = raw ? JSON.parse(raw) : []
    list.push(entry)
    localStorage.setItem('analyticsLog', JSON.stringify(list.slice(-100)))
  } catch {}
}

const rangePreset = ref<'7d'|'30d'|'90d'|'q'|'custom'>('30d')
const customStart = ref('')
const customEnd = ref('')
const compareMode = ref(false)
const pollingMs = 5 * 60 * 1000
let timer: number | null = null

const width = 600
const height = 240

const tooltip = reactive({ visible: false, text: '', x: 0, y: 0 })
const alertMessage = ref('')
const noData = computed(() => {
  const k = kpi
  return k.total_messages === 0 && k.total_conversations === 0 && messagesTrend.value.length === 0 && conversationsTrend.value.length === 0
})

const kpi = reactive({
  total_messages: 0,
  inbound_messages: 0,
  outbound_messages: 0,
  total_conversations: 0
})
const kpiPrev = reactive({
  total_messages: 0,
  inbound_messages: 0,
  outbound_messages: 0,
  total_conversations: 0
})
const kpiDelta = computed(() => ({
  total_messages: deltaFmt(kpiPrev.total_messages, kpi.total_messages),
  inbound_messages: deltaFmt(kpiPrev.inbound_messages, kpi.inbound_messages),
  outbound_messages: deltaFmt(kpiPrev.outbound_messages, kpi.outbound_messages),
  total_conversations: deltaFmt(kpiPrev.total_conversations, kpi.total_conversations)
}))

const messagesTrend = ref<{ date: string; value: number }[]>([])
const messagesTrendPrev = ref<{ date: string; value: number }[]>([])
const conversationsTrend = ref<{ date: string; value: number }[]>([])
const exportMessages = ref<any[]>([])

const platformPerc = reactive({ whatsapp: 0, instagram: 0, facebook: 0, whatsappLabel: '0%', instagramLabel: '0%', facebookLabel: '0%' })

const team = ref<any[]>([])
const teamQuery = ref('')
const sortKey = ref<'name'|'messages'|'conversations'>('messages')
const sortDir = ref<'asc'|'desc'>('desc')

const filteredTeam = computed(() => {
  const rows = team.value.filter(t => t.user.name.toLowerCase().includes(teamQuery.value.toLowerCase()))
  const mapped = rows.map(r => ({...r, name: r.user.name, messages: r.metrics.total_messages, conversations: r.metrics.total_conversations}))
  return mapped.sort((a,b) => {
    const av = a[sortKey.value]
    const bv = b[sortKey.value]
    if (av < bv) return sortDir.value==='asc' ? -1 : 1
    if (av > bv) return sortDir.value==='asc' ? 1 : -1
    return 0
  })
})

const satisfaction = (agent: any) => {
  const m = Number(agent.metrics.avg_messages_per_conversation || 0)
  const v = Math.max(0, Math.min(100, Math.round(50 + m * 10)))
  return v
}

const sortBy = (k: 'name'|'messages'|'conversations') => {
  if (sortKey.value === k) { sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc' } else { sortKey.value = k; sortDir.value = 'desc' }
}

const deltaFmt = (prev: number, curr: number) => {
  if (!prev) return '+0%'
  const d = ((curr - prev) / Math.max(1, prev)) * 100
  const s = d >= 0 ? '+' : ''
  return `${s}${Math.round(d)}%`
}

const computePlatform = (overview: any) => {
  const w = Number(overview.whatsapp_conversations || 0)
  const i = Number(overview.instagram_conversations || 0)
  const f = Number(overview.facebook_conversations || 0)
  const tot = Math.max(1, w + i + f)
  platformPerc.whatsapp = w / tot
  platformPerc.instagram = i / tot
  platformPerc.facebook = f / tot
  platformPerc.whatsappLabel = `${Math.round(platformPerc.whatsapp * 100)}%`
  platformPerc.instagramLabel = `${Math.round(platformPerc.instagram * 100)}%`
  platformPerc.facebookLabel = `${Math.round(platformPerc.facebook * 100)}%`
}

const linePoints = (series: { date: string; value: number }[]) => {
  if (!series.length) return ''
  const ys = series.map(s => s.value)
  const maxY = Math.max(...ys, 1)
  const stepX = width / Math.max(1, series.length - 1)
  return series.map((s, idx) => `${idx * stepX},${height - (s.value / maxY) * (height - 20)}`).join(' ')
}

const points = (series: { date: string; value: number }[]) => {
  if (!series.length) return []
  const ys = series.map(s => s.value)
  const maxY = Math.max(...ys, 1)
  const stepX = width / Math.max(1, series.length - 1)
  return series.map((s, idx) => ({ x: idx * stepX, y: height - (s.value / maxY) * (height - 20), label: `${s.date}: ${s.value}` }))
}

const barSeries = (series: { date: string; value: number }[]) => {
  if (!series.length) return []
  const maxY = Math.max(...series.map(s => s.value), 1)
  const stepX = width / Math.max(1, series.length)
  const barW = Math.max(6, stepX - 4)
  return series.map((s, idx) => ({ x: idx * stepX + 2, y: height - (s.value / maxY) * (height - 20), w: barW, h: (s.value / maxY) * (height - 20), label: `${s.date}: ${s.value}` }))
}

const showTip = (text: string, e: MouseEvent) => {
  tooltip.text = text
  tooltip.visible = true
  tooltip.x = (e as any).offsetX + 10
  tooltip.y = (e as any).offsetY + 10
}
const hideTip = () => { tooltip.visible = false }

const pieArc = (fraction: number, startAccum: number) => {
  const start = startAccum * Math.PI * 2
  const end = (startAccum + fraction) * Math.PI * 2
  const x1 = Math.cos(start) * 80
  const y1 = Math.sin(start) * 80
  const x2 = Math.cos(end) * 80
  const y2 = Math.sin(end) * 80
  const large = fraction > 0.5 ? 1 : 0
  return `M0,0 L${x1},${y1} A80,80 0 ${large} 1 ${x2},${y2} Z`
}

const sendReportEmail = () => {
  showToast('Funzione invio email disponibile a backend', 'info')
}

const exportCsv = async () => {
  const { start, end } = getRange()
  const msgs = exportMessages.value || []
  if (!Array.isArray(msgs) || msgs.length === 0) {
    showToast('nessun dato disponibile', 'info')
    return
  }

  const header = ['timestamp', 'direction', 'from', 'to', 'content']
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = msgs.map((m: any) => {
    const t = m.created_at || m.timestamp || ''
    const direction = m.direction || ''
    const from = m.from || m.from_phone || ''
    const to = m.to || m.to_phone || ''
    const content = m.content || m.message || m.text || ''
    return [t, direction, from, to, content].map(esc).join(',')
  })

  const txt = [header.join(','), ...rows].join('\n')
  const blob = new Blob([txt], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `analytics-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  logEvent('export_csv', { start, end })
}

const printPdf = () => {
  const { start, end } = getRange()
  const startLabel = new Date(start).toLocaleDateString('it-IT')
  const endLabel = new Date(end).toLocaleDateString('it-IT')
  const genDate = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  const kpiRows = [
    ['Messaggi Totali', kpi.total_messages, kpiDelta.value.total_messages],
    ['Messaggi Inbound', kpi.inbound_messages, kpiDelta.value.inbound_messages],
    ['Messaggi Outbound', kpi.outbound_messages, kpiDelta.value.outbound_messages],
    ['Conversazioni', kpi.total_conversations, kpiDelta.value.total_conversations],
  ]

  const trendRows = messagesTrend.value
    .map(s => `<tr><td>${s.date}</td><td>${s.value}</td></tr>`)
    .join('')

  const teamRows = filteredTeam.value
    .map(a => `<tr><td>${a.user.name}</td><td>${a.user.role || '—'}</td><td>${a.metrics.total_messages}</td><td>${a.metrics.total_conversations}</td></tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8"/>
  <title>Report Analytics — ${startLabel} / ${endLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 24px; font-size: 11px; }
    h2 { font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .positive { color: #16a34a; } .negative { color: #dc2626; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>Report Analytics</h1>
  <p class="meta">Periodo: ${startLabel} – ${endLabel} &nbsp;|&nbsp; Generato il ${genDate}</p>

  <h2>KPI principali</h2>
  <table>
    <thead><tr><th>Metrica</th><th>Valore</th><th>Variazione</th></tr></thead>
    <tbody>
      ${kpiRows.map(([label, val, delta]) => {
        const cls = String(delta).startsWith('+') ? 'positive' : String(delta).startsWith('-') ? 'negative' : ''
        return `<tr><td>${label}</td><td>${val}</td><td class="${cls}">${delta}</td></tr>`
      }).join('')}
    </tbody>
  </table>

  <h2>Andamento messaggi</h2>
  ${trendRows ? `<table><thead><tr><th>Data</th><th>Messaggi</th></tr></thead><tbody>${trendRows}</tbody></table>` : '<p>Nessun dato disponibile</p>'}

  <h2>Distribuzione piattaforme</h2>
  <table>
    <thead><tr><th>Piattaforma</th><th>%</th></tr></thead>
    <tbody>
      <tr><td>WhatsApp</td><td>${platformPerc.whatsappLabel}</td></tr>
      <tr><td>Instagram</td><td>${platformPerc.instagramLabel}</td></tr>
      <tr><td>Facebook</td><td>${platformPerc.facebookLabel}</td></tr>
    </tbody>
  </table>

  ${teamRows ? `<h2>Performance team</h2><table>
    <thead><tr><th>Agente</th><th>Ruolo</th><th>Messaggi</th><th>Conversazioni</th></tr></thead>
    <tbody>${teamRows}</tbody>
  </table>` : ''}
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    showToast('Abilita i popup per generare il PDF', 'error')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  // Small delay so fonts/styles render before print dialog opens
  setTimeout(() => { win.print() }, 400)
  logEvent('print_pdf', { start, end })
}

const getRange = () => {
  const now = new Date()
  if (rangePreset.value === 'custom' && customStart.value && customEnd.value) return { start: new Date(customStart.value).toISOString(), end: new Date(customEnd.value).toISOString() }
  if (rangePreset.value === '7d') return { start: new Date(Date.now() - 7*24*60*60*1000).toISOString(), end: now.toISOString() }
  if (rangePreset.value === '30d') return { start: new Date(Date.now() - 30*24*60*60*1000).toISOString(), end: now.toISOString() }
  if (rangePreset.value === '90d') return { start: new Date(Date.now() - 90*24*60*60*1000).toISOString(), end: now.toISOString() }
  const q = 90*24*60*60*1000
  return { start: new Date(Date.now() - q).toISOString(), end: now.toISOString() }
}

const getPrevRange = () => {
  const { start, end } = getRange()
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const span = e - s
  const prevEnd = new Date(s).toISOString()
  const prevStart = new Date(s - span).toISOString()
  return { start: prevStart, end: prevEnd }
}

const detectAnomalies = (series: { date: string; value: number }[]) => {
  if (series.length < 5) return
  const values = series.map(s => s.value)
  const median = values.sort((a,b)=>a-b)[Math.floor(values.length/2)]
  const spike = series.find(s => s.value >= 3 * median)
  if (spike) alertMessage.value = `Anomalia: picco messaggi il ${spike.date} (${spike.value})`
}

const fetchWaMessages = async (start: string, end: string) => {
  const { data, error } = await supabase
    .from('wa_messages')
    .select('id, direction, timestamp, created_at, contact_phone')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((m: any) => ({
    id: m.id,
    direction: m.direction === 'incoming' ? 'inbound' : 'outbound',
    contact_phone: m.contact_phone || '',
    created_at: m.timestamp || m.created_at || '',
  }))
}

const loadOverview = async () => {
  const { start, end } = getRange()
  let msgs: any[] = []
  try {
    msgs = await fetchWaMessages(start, end)
  } catch {}
  exportMessages.value = msgs
  kpi.total_messages = msgs.length
  kpi.inbound_messages = msgs.filter(m => m.direction === 'inbound').length
  kpi.outbound_messages = msgs.filter(m => m.direction === 'outbound').length
  const convSet = new Set<string>()
  for (const m of msgs) {
    if (m.contact_phone) convSet.add(m.contact_phone)
  }
  kpi.total_conversations = convSet.size
  computePlatform({ whatsapp_conversations: convSet.size, instagram_conversations: 0, facebook_conversations: 0 })
  const byDateMsg: Record<string, number> = {}
  const byDateConv: Record<string, Set<string>> = {}
  for (const m of msgs) {
    const t = String(m.created_at || '')
    if (!t) continue
    const d = new Date(t)
    if (isNaN(d.getTime())) continue
    const key = d.toISOString().slice(0,10)
    byDateMsg[key] = (byDateMsg[key] || 0) + 1
    if (!byDateConv[key]) byDateConv[key] = new Set<string>()
    if (m.contact_phone) byDateConv[key].add(m.contact_phone)
  }
  const mObj: any = {}
  const cObj: any = {}
  Object.keys(byDateMsg).forEach(k => mObj[k] = byDateMsg[k])
  Object.keys(byDateConv).forEach(k => cObj[k] = byDateConv[k].size)
  messagesTrend.value = Object.keys(mObj).sort().map(d => ({ date: d, value: Number(mObj[d]||0) }))
  conversationsTrend.value = Object.keys(cObj).sort().map(d => ({ date: d, value: Number(cObj[d]||0) }))
  detectAnomalies(messagesTrend.value)
  if (compareMode.value) {
    const prev = getPrevRange()
    let msgs2: any[] = []
    try {
      msgs2 = await fetchWaMessages(prev.start, prev.end)
    } catch {}
    kpiPrev.total_messages = msgs2.length
    kpiPrev.inbound_messages = msgs2.filter(m => m.direction === 'inbound').length
    kpiPrev.outbound_messages = msgs2.filter(m => m.direction === 'outbound').length
    kpiPrev.total_conversations = (new Set(msgs2.map((mm: any) => mm.contact_phone || '').filter(Boolean))).size
    const byPrev: Record<string, number> = {}
    for (const m of msgs2) {
      const t = String(m.created_at || '')
      if (!t) continue
      const d = new Date(t)
      if (isNaN(d.getTime())) continue
      const key = d.toISOString().slice(0,10)
      byPrev[key] = (byPrev[key] || 0) + 1
    }
    messagesTrendPrev.value = Object.keys(byPrev).sort().map(d => ({ date: d, value: Number(byPrev[d]||0) }))
  } else {
    kpiPrev.total_messages = 0
    kpiPrev.inbound_messages = 0
    kpiPrev.outbound_messages = 0
    kpiPrev.total_conversations = 0
    messagesTrendPrev.value = []
  }
}

const loadTeam = async () => {
  team.value = []
}

const refreshAll = async () => {
  await Promise.all([loadOverview(), loadTeam()])
}

onMounted(async () => {
  await refreshAll()
  timer = window.setInterval(refreshAll, pollingMs)
})

onBeforeUnmount(() => { if (timer) window.clearInterval(timer) })

watch([rangePreset, customStart, customEnd, compareMode], () => { refreshAll(); logEvent('filters_change', { range: rangePreset.value, compare: compareMode.value }) })
</script>
