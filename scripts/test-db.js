import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import process from 'node:process'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

async function main() {
  console.log('🔌 Connessione al database...')
  let conn
  try {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env
    const port = Number(process.env.DB_PORT || 3306)
    const ssl = String(process.env.DB_SSL || '').trim() ? { rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true') !== 'false' } : undefined
    if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
      throw new Error('Missing DB env vars. Please set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME')
    }

    conn = await mysql.createConnection({ host: DB_HOST, port, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, ssl })
    console.log('✅ Connesso!')

    // Verifica tabelle
    const [tables] = await conn.query('SHOW TABLES')
    console.log('📂 Tabelle trovate:', tables.map(t => Object.values(t)[0]))

    // Check columns in wa_contacts to debug
    console.log('🔍 Verifica colonne wa_contacts...')
    const [columns] = await conn.query('SHOW COLUMNS FROM wa_contacts')
    console.log('📊 Colonne:', columns.map(c => c.Field))

    const hasPhone = columns.some(c => c.Field === 'phone')
    if (!hasPhone) {
      throw new Error('Schema mismatch: wa_contacts.phone column not found')
    }

    // Insert Demo Contact
    const demoPhone = '+393330000000'
    const demoName = 'Contatto Demo'
    console.log(`📝 Inserimento contatto demo: ${demoName} (${demoPhone})...`)
    
    await conn.query(`
      INSERT INTO wa_contacts (phone, name, tags)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [demoPhone, demoName, JSON.stringify(['Demo', 'Test'])])
    
    console.log('✅ Contatto inserito/aggiornato')

    // Verify Insert
    const [rows] = await conn.query('SELECT * FROM wa_contacts WHERE phone = ?', [demoPhone])
    console.log('👀 Verifica dati:', rows)

  } catch (err) {
    console.error('❌ Errore:', err.message)
    process.exit(1)
  } finally {
    if (conn) await conn.end()
  }
}

main()
