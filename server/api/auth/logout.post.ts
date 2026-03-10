import { getAuthSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  await session.clear()
  return { message: 'Logged out successfully' }
})
