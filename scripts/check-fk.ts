import { createClient } from '@libsql/client'

const client = createClient({ url: 'file:local.db' })

async function check() {
  const company = await client.execute({
    sql: 'SELECT id FROM companies WHERE id = ?',
    args: [13]
  })
  const user = await client.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [11]
  })

  console.log('Company 13 exists:', company.rows.length > 0)
  console.log('User 11 exists:', user.rows.length > 0)
}

check()
