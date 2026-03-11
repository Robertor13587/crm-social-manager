/**
 * migrate_mysql_to_supabase.js
 *
 * Copia i dati da MySQL (wa_contacts, wa_messages) a Supabase.
 * Usa il Service Role Key per bypassare RLS.
 *
 * Prerequisiti:
 *   1. Aver eseguito la migration SQL su Supabase
 *      (supabase/migrations/20250220000001_initial_schema.sql)
 *   2. Configurare .env.local con:
 *        DB_HOST, DB_USER, DB_PASSWORD, DB_NAME   (MySQL sorgente)
 *        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (Supabase destinazione)
 *
 * Uso:
 *   node scripts/migrate_mysql_to_supabase.js
 *   node scripts/migrate_mysql_to_supabase.js --dry-run   (solo conteggio, nessuna scrittura)
 *   node scripts/migrate_mysql_to_supabase.js --batch 500 (dimensione batch, default 250)
 */

import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

const DRY_RUN   = process.argv.includes('--dry-run')
const BATCH_IDX = process.argv.indexOf('--batch')
const BATCH     = BATCH_IDX !== -1 ? Number(process.argv[BATCH_IDX + 1]) || 250 : 250

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '')
}

function toIso(val) {
  if (!val) return null
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

async function upsertBatch(supabase, table, rows) {
  if (DRY_RUN || rows.length === 0) return { error: null }
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: false })
  return { error }
}

// ─── contacts migration ───────────────────────────────────────────────────────

async function migrateContacts(conn, supabase) {
  console.log('\n── wa_contacts ──────────────────────────────────')
  const [rows] = await conn.query(`
    SELECT id, phone, name, tags, notes, created_at
    FROM wa_contacts
    ORDER BY id
  `)
  console.log(`  MySQL rows: ${rows.length}`)

  const mapped = rows
    .filter(r => r.phone)
    .map(r => ({
      // usa un UUID deterministico basato su phone_normalized per idempotenza
      // Supabase non ha UUID v5 nativo in JS, usiamo phone_normalized come id testuale
      // ma la tabella ha id uuid — usiamo gen_random_uuid() lato SQL, e gestiamo
      // l'idempotenza via unique(phone_normalized)
      phone:      String(r.phone || '').trim(),
      name:       r.name ? String(r.name).trim() : null,
      tags:       r.tags ? (Array.isArray(r.tags) ? r.tags : [String(r.tags)]) : [],
      notes:      r.notes ? String(r.notes).trim() : null,
      created_at: toIso(r.created_at),
    }))
    .filter(r => normalizePhone(r.phone).length > 0)

  console.log(`  Da inserire (dopo filtro): ${mapped.length}`)
  if (DRY_RUN) { console.log('  [dry-run] saltato'); return }

  let ok = 0, fail = 0
  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH)
    // upsert on conflict (phone_normalized) — non è direttamente supportato da Supabase
    // usiamo insert ignorando i duplicati tramite la unique constraint
    const { error } = await supabase
      .from('wa_contacts')
      .insert(batch, { ignoreDuplicates: true })
    if (error) {
      console.error(`  Batch ${i}–${i + batch.length} ERRORE:`, error.message)
      fail += batch.length
    } else {
      ok += batch.length
      process.stdout.write(`  \r  ${ok + fail}/${mapped.length} …`)
    }
  }
  console.log(`\n  OK: ${ok}  Fail: ${fail}`)
}

// ─── messages migration ───────────────────────────────────────────────────────

async function migrateMessages(conn, supabase) {
  console.log('\n── wa_messages ──────────────────────────────────')
  const [rows] = await conn.query(`
    SELECT id, wa_id, from_phone, to_phone, direction, message, status, timestamp, status_timestamp
    FROM wa_messages
    ORDER BY id
  `)
  console.log(`  MySQL rows: ${rows.length}`)

  const mapped = rows
    .filter(r => {
      const msg = String(r.message || '').trim().toLowerCase()
      // scarta righe con solo status come contenuto
      if (['sent','delivered','failed','read',''].includes(msg) && !r.wa_id) return false
      return r.from_phone || r.to_phone
    })
    .map(r => ({
      wa_id:            r.wa_id ? String(r.wa_id).trim() : null,
      from_phone:       r.from_phone ? String(r.from_phone).trim() : null,
      to_phone:         r.to_phone ? String(r.to_phone).trim() : null,
      direction:        ['incoming','outgoing'].includes(r.direction) ? r.direction : null,
      content:          r.message ? String(r.message).trim() : null,
      status:           r.status ? String(r.status).trim() : null,
      timestamp:        toIso(r.timestamp),
      status_timestamp: toIso(r.status_timestamp),
    }))

  console.log(`  Da inserire (dopo filtro): ${mapped.length}`)
  if (DRY_RUN) { console.log('  [dry-run] saltato'); return }

  let ok = 0, fail = 0
  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH)
    const { error } = await supabase
      .from('wa_messages')
      .insert(batch, { ignoreDuplicates: true })   // wa_id unique gestisce i dup
    if (error) {
      console.error(`  Batch ${i}–${i + batch.length} ERRORE:`, error.message)
      fail += batch.length
    } else {
      ok += batch.length
      process.stdout.write(`  \r  ${ok + fail}/${mapped.length} …`)
    }
  }
  console.log(`\n  OK: ${ok}  Fail: ${fail}`)
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function run() {
  // Verifica env vars
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.error('Mancano variabili MySQL: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME')
    process.exit(1)
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Mancano variabili Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (DRY_RUN) console.log('[DRY RUN] Nessun dato sarà scritto su Supabase\n')

  // Client Supabase con service role (bypassa RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Connessione MySQL
  const port = Number(process.env.DB_PORT || 3306)
  const ssl  = process.env.DB_SSL ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined
  const conn = await mysql.createConnection({ host: DB_HOST, port, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, ssl })

  console.log('Connesso a MySQL:', DB_NAME)
  console.log('Destinazione Supabase:', SUPABASE_URL)
  console.log('Batch size:', BATCH)

  try {
    await migrateContacts(conn, supabase)
    await migrateMessages(conn, supabase)
    console.log('\n✓ Migrazione completata')
  } catch (err) {
    console.error('\n✗ Migrazione fallita:', err)
    process.exitCode = 1
  } finally {
    await conn.end()
  }
}

run()
