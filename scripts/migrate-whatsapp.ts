import { createClient } from '@libsql/client'

const c = createClient({ url: 'file:local.db' })

await c.execute(`
  CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    api_url TEXT NOT NULL DEFAULT 'http://localhost:3025',
    api_key TEXT,
    phone_number TEXT,
    is_connected INTEGER NOT NULL DEFAULT 0,
    alerts_enabled INTEGER NOT NULL DEFAULT 0,
    reports_enabled INTEGER NOT NULL DEFAULT 0,
    alert_recipients TEXT DEFAULT '[]',
    report_recipients TEXT DEFAULT '[]',
    report_schedule TEXT NOT NULL DEFAULT 'daily',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`)

console.log('✅ whatsapp_settings migration applied')
await c.close()
