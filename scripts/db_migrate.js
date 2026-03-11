import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

dotenv.config({ path: '.env.local', override: true })
dotenv.config()

async function existsTable(conn, table) {
  const [rows] = await conn.query('SHOW TABLES LIKE ?', [table])
  return Array.isArray(rows) && rows.length > 0
}

async function existsIndex(conn, table, name) {
  const [rows] = await conn.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [name])
  return Array.isArray(rows) && rows.length > 0
}

async function existsColumn(conn, table, column) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column])
  return Array.isArray(rows) && rows.length > 0
}

async function existsRoutine(conn, routineName, routineType) {
  const [rows] = await conn.query(
    `
      SELECT ROUTINE_NAME
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = DATABASE()
        AND ROUTINE_NAME = ?
        AND ROUTINE_TYPE = ?
      LIMIT 1
    `,
    [routineName, routineType],
  )
  return Array.isArray(rows) && rows.length > 0
}

async function existsForeignKey(conn, table, constraintName) {
  const [rows] = await conn.query(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND CONSTRAINT_NAME = ?
      LIMIT 1
    `,
    [table, constraintName],
  )
  return Array.isArray(rows) && rows.length > 0
}

async function withTransaction(conn, fn) {
  await conn.query('START TRANSACTION')
  try {
    const res = await fn()
    await conn.query('COMMIT')
    return res
  } catch (err) {
    try {
      await conn.query('ROLLBACK')
    } catch {}
    throw err
  }
}

async function run() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env
  const port = Number(process.env.DB_PORT || 3306)
  const ssl = String(process.env.DB_SSL || '').trim() ? { rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true') !== 'false' } : undefined
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.error('Missing DB env vars. Please set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME')
    process.exit(1)
  }

  const conn = await mysql.createConnection({ host: DB_HOST, port, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, ssl })
  try {
    console.log('Connected to DB')

    const hasMessages = await existsTable(conn, 'wa_messages')
    const hasContacts = await existsTable(conn, 'wa_contacts')
    if (!hasMessages || !hasContacts) {
      throw new Error('Missing required tables wa_messages or wa_contacts')
    }

    console.log('Normalizing wa_messages rows...')
    await withTransaction(conn, async () => {
      await conn.query(`
        UPDATE wa_messages
        SET
          wa_id = NULLIF(TRIM(wa_id), ''),
          from_phone = NULLIF(TRIM(from_phone), ''),
          to_phone = NULLIF(TRIM(to_phone), ''),
          status = NULLIF(TRIM(status), ''),
          message = NULLIF(TRIM(message), '')
      `)

      await conn.query(`
        UPDATE wa_messages
        SET wa_id = NULL
        WHERE wa_id = 'undefined'
      `)
      await conn.query(`
        UPDATE wa_messages
        SET from_phone = NULL
        WHERE from_phone = 'undefined'
      `)
      await conn.query(`
        UPDATE wa_messages
        SET to_phone = NULL
        WHERE to_phone = 'undefined'
      `)
      await conn.query(`
        UPDATE wa_messages
        SET message = NULL
        WHERE message = 'undefined'
      `)
      await conn.query(`
        UPDATE wa_messages
        SET status = NULL
        WHERE status = 'undefined'
      `)

      await conn.query(`
        UPDATE wa_messages
        SET from_phone = CONCAT('+', from_phone)
        WHERE from_phone REGEXP '^[0-9]+$'
      `)
      await conn.query(`
        UPDATE wa_messages
        SET to_phone = CONCAT('+', to_phone)
        WHERE to_phone REGEXP '^[0-9]+$'
      `)

      await conn.query(`
        UPDATE wa_messages
        SET timestamp = NULL
        WHERE timestamp = '0000-00-00 00:00:00'
      `)
    })

    console.log('Deduplicating wa_contacts...')
    await withTransaction(conn, async () => {
      await conn.query(`
        DELETE t1 FROM wa_contacts t1
        INNER JOIN wa_contacts t2
          ON REPLACE(t1.phone, '+', '') = REPLACE(t2.phone, '+', '')
         AND t1.id > t2.id
      `)
    })
    console.log('Dedup completed')

    const hasNorm = await existsColumn(conn, 'wa_contacts', 'phone_normalized')
    if (!hasNorm) {
      console.log('Adding phone_normalized generated column...')
      await conn.query(`
        ALTER TABLE wa_contacts
        ADD COLUMN phone_normalized VARCHAR(50)
        GENERATED ALWAYS AS (REPLACE(phone, '+', '')) VIRTUAL
      `)
      console.log('phone_normalized column added')
    } else {
      console.log('phone_normalized column already exists, skipping')
    }

    const hasUnique = await existsIndex(conn, 'wa_contacts', 'uq_wa_contacts_phone_norm')
    if (!hasUnique) {
      console.log('Adding unique index on phone_normalized...')
      await conn.query(`
        ALTER TABLE wa_contacts
        ADD UNIQUE KEY uq_wa_contacts_phone_norm (phone_normalized)
      `)
      console.log('Unique index added')
    } else {
      console.log('Unique index uq_wa_contacts_phone_norm exists, skipping')
    }

    const idxs = [
      { name: 'idx_from_phone', ddl: 'ALTER TABLE wa_messages ADD INDEX idx_from_phone (from_phone)' },
      { name: 'idx_to_phone', ddl: 'ALTER TABLE wa_messages ADD INDEX idx_to_phone (to_phone)' },
      { name: 'idx_timestamp', ddl: 'ALTER TABLE wa_messages ADD INDEX idx_timestamp (timestamp)' },
      { name: 'idx_to_phone_timestamp', ddl: 'ALTER TABLE wa_messages ADD INDEX idx_to_phone_timestamp (to_phone, timestamp)' },
      { name: 'idx_from_phone_timestamp', ddl: 'ALTER TABLE wa_messages ADD INDEX idx_from_phone_timestamp (from_phone, timestamp)' },
    ]

    for (const i of idxs) {
      const exists = await existsIndex(conn, 'wa_messages', i.name)
      if (!exists) {
        console.log(`Adding index ${i.name}...`)
        await conn.query(i.ddl)
        console.log(`Index ${i.name} added`)
      } else {
        console.log(`Index ${i.name} exists, skipping`)
      }
    }

    const hasStatusTs = await existsColumn(conn, 'wa_messages', 'status_timestamp')
    if (!hasStatusTs) {
      console.log('Adding wa_messages.status_timestamp column...')
      await conn.query(`
        ALTER TABLE wa_messages
        ADD COLUMN status_timestamp datetime DEFAULT NULL
      `)
      console.log('status_timestamp column added')
    } else {
      console.log('wa_messages.status_timestamp column already exists, skipping')
    }

    const hasContactPhone = await existsColumn(conn, 'wa_messages', 'contact_phone')
    if (!hasContactPhone) {
      console.log('Adding wa_messages.contact_phone generated column...')
      await conn.query(`
        ALTER TABLE wa_messages
        ADD COLUMN contact_phone VARCHAR(50)
        GENERATED ALWAYS AS (
          CASE
            WHEN direction = 'incoming' THEN from_phone
            ELSE to_phone
          END
        ) STORED
      `)
      console.log('contact_phone column added')
    } else {
      console.log('wa_messages.contact_phone already exists, skipping')
    }

    const fastIdxs = [
      { name: 'idx_contact_phone', ddl: 'ALTER TABLE wa_messages ADD INDEX idx_contact_phone (contact_phone)' },
      {
        name: 'idx_contact_phone_timestamp',
        ddl: 'ALTER TABLE wa_messages ADD INDEX idx_contact_phone_timestamp (contact_phone, timestamp)',
      },
    ]
    for (const i of fastIdxs) {
      const exists = await existsIndex(conn, 'wa_messages', i.name)
      if (!exists) {
        console.log(`Adding index ${i.name}...`)
        await conn.query(i.ddl)
        console.log(`Index ${i.name} added`)
      } else {
        console.log(`Index ${i.name} exists, skipping`)
      }
    }

    console.log('Migrating status text incorrectly saved as message...')
    await conn.query(`
      UPDATE wa_messages
      SET
        status = message,
        message = NULL,
        status_timestamp = COALESCE(status_timestamp, timestamp)
      WHERE status IS NULL
        AND message IN ('sent', 'delivered', 'failed', 'read')
    `)

    console.log('Merging duplicate wa_messages by wa_id...')
    await withTransaction(conn, async () => {
      await conn.query(`
        UPDATE wa_messages keep_row
        JOIN wa_messages dup_row
          ON keep_row.wa_id = dup_row.wa_id
         AND keep_row.id < dup_row.id
        SET
          keep_row.from_phone = COALESCE(keep_row.from_phone, dup_row.from_phone),
          keep_row.to_phone = COALESCE(keep_row.to_phone, dup_row.to_phone),
          keep_row.direction = COALESCE(keep_row.direction, dup_row.direction),
          keep_row.message = COALESCE(keep_row.message, dup_row.message),
          keep_row.status = COALESCE(
            keep_row.status,
            dup_row.status,
            CASE
              WHEN dup_row.message IN ('sent', 'delivered', 'failed', 'read') THEN dup_row.message
              ELSE NULL
            END
          ),
          keep_row.status_timestamp = GREATEST(
            COALESCE(keep_row.status_timestamp, '0000-00-00 00:00:00'),
            COALESCE(dup_row.status_timestamp, dup_row.timestamp, '0000-00-00 00:00:00')
          )
        WHERE keep_row.wa_id IS NOT NULL
      `)

      console.log('Deleting duplicate wa_messages by wa_id...')
      await conn.query(`
        DELETE dup_row
        FROM wa_messages dup_row
        JOIN wa_messages keep_row
          ON keep_row.wa_id = dup_row.wa_id
         AND keep_row.id < dup_row.id
        WHERE dup_row.wa_id IS NOT NULL
      `)
    })

    const hasUqWaId = await existsIndex(conn, 'wa_messages', 'uq_wa_messages_wa_id')
    if (!hasUqWaId) {
      console.log('Adding unique index uq_wa_messages_wa_id on wa_messages.wa_id...')
      await conn.query(`
        ALTER TABLE wa_messages
        ADD UNIQUE KEY uq_wa_messages_wa_id (wa_id)
      `)
      console.log('Unique index uq_wa_messages_wa_id added')
    } else {
      console.log('Unique index uq_wa_messages_wa_id exists, skipping')
    }

    const hasAudit = await existsTable(conn, 'db_audit_log')
    if (!hasAudit) {
      console.log('Creating db_audit_log table...')
      await conn.query(`
        CREATE TABLE db_audit_log (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          actor VARCHAR(100) DEFAULT NULL,
          action VARCHAR(100) NOT NULL,
          entity VARCHAR(100) DEFAULT NULL,
          entity_id VARCHAR(255) DEFAULT NULL,
          payload_json LONGTEXT DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          PRIMARY KEY (id),
          KEY idx_action_created_at (action, created_at),
          KEY idx_entity_entity_id (entity, entity_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci
      `)
      console.log('db_audit_log created')
    } else {
      console.log('db_audit_log already exists, skipping')
    }

    const hasLogProc = await existsRoutine(conn, 'sp_wa_log_message', 'PROCEDURE')
    if (!hasLogProc) {
      console.log('Creating stored procedure sp_wa_log_message...')
      await conn.query(`
        CREATE PROCEDURE sp_wa_log_message(
          IN p_wa_id VARCHAR(255),
          IN p_from_phone VARCHAR(50),
          IN p_to_phone VARCHAR(50),
          IN p_direction ENUM('incoming','outgoing'),
          IN p_message TEXT,
          IN p_status VARCHAR(50),
          IN p_timestamp DATETIME,
          IN p_status_timestamp DATETIME,
          IN p_actor VARCHAR(100)
        )
        BEGIN
          SET p_wa_id = NULLIF(TRIM(p_wa_id), '');
          SET p_from_phone = NULLIF(TRIM(p_from_phone), '');
          SET p_to_phone = NULLIF(TRIM(p_to_phone), '');
          SET p_message = NULLIF(TRIM(p_message), '');
          SET p_status = NULLIF(TRIM(p_status), '');

          IF p_wa_id = 'undefined' THEN SET p_wa_id = NULL; END IF;
          IF p_from_phone = 'undefined' THEN SET p_from_phone = NULL; END IF;
          IF p_to_phone = 'undefined' THEN SET p_to_phone = NULL; END IF;
          IF p_message = 'undefined' THEN SET p_message = NULL; END IF;
          IF p_status = 'undefined' THEN SET p_status = NULL; END IF;

          IF p_from_phone REGEXP '^[0-9]+$' THEN SET p_from_phone = CONCAT('+', p_from_phone); END IF;
          IF p_to_phone REGEXP '^[0-9]+$' THEN SET p_to_phone = CONCAT('+', p_to_phone); END IF;

          IF p_timestamp = '0000-00-00 00:00:00' THEN SET p_timestamp = NULL; END IF;
          IF p_status_timestamp = '0000-00-00 00:00:00' THEN SET p_status_timestamp = NULL; END IF;

          IF p_wa_id IS NULL THEN
            INSERT INTO wa_messages (wa_id, from_phone, to_phone, direction, status, message, timestamp, status_timestamp)
            VALUES (NULL, p_from_phone, p_to_phone, p_direction, p_status, p_message, p_timestamp, p_status_timestamp);
          ELSE
            INSERT INTO wa_messages (wa_id, from_phone, to_phone, direction, status, message, timestamp, status_timestamp)
            VALUES (p_wa_id, p_from_phone, p_to_phone, p_direction, p_status, p_message, p_timestamp, p_status_timestamp)
            ON DUPLICATE KEY UPDATE
              from_phone = COALESCE(from_phone, VALUES(from_phone)),
              to_phone = COALESCE(to_phone, VALUES(to_phone)),
              direction = COALESCE(direction, VALUES(direction)),
              message = COALESCE(message, VALUES(message)),
              status = COALESCE(VALUES(status), status),
              timestamp = COALESCE(timestamp, VALUES(timestamp)),
              status_timestamp = COALESCE(VALUES(status_timestamp), status_timestamp);
          END IF;

          IF p_actor IS NOT NULL THEN
            INSERT INTO db_audit_log (actor, action, entity, entity_id, payload_json)
            VALUES (
              p_actor,
              'wa_log_message',
              'wa_messages',
              COALESCE(p_wa_id, CAST(LAST_INSERT_ID() AS CHAR)),
              JSON_OBJECT(
                'wa_id', p_wa_id,
                'from_phone', p_from_phone,
                'to_phone', p_to_phone,
                'direction', p_direction,
                'status', p_status,
                'message', p_message,
                'timestamp', p_timestamp,
                'status_timestamp', p_status_timestamp
              )
            );
          END IF;
        END
      `)
      console.log('sp_wa_log_message created')
    } else {
      console.log('sp_wa_log_message already exists, skipping')
    }

    const hasContactsTable = await existsTable(conn, 'contacts')
    const hasConversationsTable = await existsTable(conn, 'conversations')
    const hasMessagesTable = await existsTable(conn, 'messages')

    if (hasContactsTable && hasConversationsTable) {
      const hasFk = await existsForeignKey(conn, 'conversations', 'fk_conversations_contact_id')
      if (!hasFk) {
        const [rows] = await conn.query(`
          SELECT COUNT(*) AS orphan_count
          FROM conversations c
          LEFT JOIN contacts ct ON ct.id = c.contact_id
          WHERE c.contact_id IS NOT NULL AND ct.id IS NULL
        `)
        const orphanCount = Number(rows?.[0]?.orphan_count || 0)
        if (orphanCount === 0) {
          console.log('Adding FK conversations.contact_id -> contacts.id...')
          await conn.query(`
            ALTER TABLE conversations
            ADD CONSTRAINT fk_conversations_contact_id
            FOREIGN KEY (contact_id) REFERENCES contacts(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE
          `)
          console.log('FK fk_conversations_contact_id added')
        } else {
          console.log(`Skipping FK fk_conversations_contact_id (orphans: ${orphanCount})`)
        }
      } else {
        console.log('FK fk_conversations_contact_id already exists, skipping')
      }
    }

    if (hasConversationsTable && hasMessagesTable) {
      const hasFk = await existsForeignKey(conn, 'messages', 'fk_messages_conversation_id')
      if (!hasFk) {
        const [rows] = await conn.query(`
          SELECT COUNT(*) AS orphan_count
          FROM messages m
          LEFT JOIN conversations c ON c.id = m.conversation_id
          WHERE c.id IS NULL
        `)
        const orphanCount = Number(rows?.[0]?.orphan_count || 0)
        if (orphanCount === 0) {
          console.log('Adding FK messages.conversation_id -> conversations.id...')
          await conn.query(`
            ALTER TABLE messages
            ADD CONSTRAINT fk_messages_conversation_id
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
          `)
          console.log('FK fk_messages_conversation_id added')
        } else {
          console.log(`Skipping FK fk_messages_conversation_id (orphans: ${orphanCount})`)
        }
      } else {
        console.log('FK fk_messages_conversation_id already exists, skipping')
      }
    }

    console.log('DB migrations completed successfully')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exitCode = 1
  } finally {
    await conn.end()
  }
}

run()
