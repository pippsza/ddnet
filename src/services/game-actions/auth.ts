import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { authenticateClientToken } from '@/lib/client-auth'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import type { ResolvedAuth } from './types'

export async function resolveAuth(
  req: NextRequest,
  source?: 'client' | 'web',
): Promise<ResolvedAuth | NextResponse> {
  if (!source) {
    const authHeader = req.headers.get('authorization')
    source = authHeader?.startsWith('Bearer ') ? 'client' : 'web'
  }

  if (source === 'client') {
    const result = await authenticateClientToken(req)
    if (result instanceof NextResponse) return result
    return { user: result.user, payload: result.payload }
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { user, payload }
}

export async function resolveOptionalAuth(
  req: NextRequest,
): Promise<{ user: User | null; payload: Payload }> {
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const result = await authenticateClientToken(req)
    if (result instanceof NextResponse) {
      const payload = await getPayload({ config })
      return { user: null, payload }
    }
    return { user: result.user, payload: result.payload }
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  return { user: user || null, payload }
}
