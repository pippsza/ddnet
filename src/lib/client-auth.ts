import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'

export interface ClientAuthResult {
  user: User
  payload: Awaited<ReturnType<typeof getPayload>>
}

/**
 * Authenticate a client request via Bearer token.
 * Reads `Authorization: Bearer <clientToken>` header,
 * looks up the user by `clientToken` field.
 *
 * Returns `{ user, payload }` on success, or a NextResponse error.
 */
export async function authenticateClientToken(
  req: NextRequest,
): Promise<ClientAuthResult | NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const payload = await getPayload({ config })

  const { docs: users } = await payload.find({
    collection: 'users',
    where: { clientToken: { equals: token } },
    overrideAccess: true,
    limit: 1,
    depth: 0,
  })

  if (users.length === 0) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  return { user: users[0] as User, payload }
}
