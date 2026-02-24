import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { hasPermission, isAdmin } from '@/lib/permissions'
import type { User } from '@/payload-types'
import type { PayloadRequest } from 'payload'

interface AuthResult {
  user: User
  payload: Awaited<ReturnType<typeof getPayload>>
}

/**
 * Require access to a specific admin page.
 * Returns { user, payload } on success, or a NextResponse error.
 */
export async function requireAdminPage(
  req: NextRequest,
  page: string,
): Promise<AuthResult | NextResponse> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const typedUser = user as unknown as User
  if (isAdmin(typedUser)) return { user: typedUser, payload }

  const payloadReq = { user, payload, headers: req.headers } as unknown as PayloadRequest
  const allowed = await hasPermission(payloadReq, 'adminPages', page)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return { user: typedUser, payload }
}

/**
 * Require a specific permission in a category.
 * Returns { user, payload } on success, or a NextResponse error.
 */
export async function requirePermission(
  req: NextRequest,
  category: 'articles' | 'support' | 'forum' | 'games' | 'adminPages',
  permission: string,
): Promise<AuthResult | NextResponse> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const typedUser = user as unknown as User
  if (isAdmin(typedUser)) return { user: typedUser, payload }

  const payloadReq = { user, payload, headers: req.headers } as unknown as PayloadRequest
  const allowed = await hasPermission(payloadReq, category, permission)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return { user: typedUser, payload }
}
