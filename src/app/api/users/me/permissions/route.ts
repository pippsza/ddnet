import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { resolvePermissions } from '@/lib/permissions'
import type { PayloadRequest } from 'payload'

export async function GET(req: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payloadReq = { user, payload, headers: req.headers } as unknown as PayloadRequest
  const perms = await resolvePermissions(user as { roles?: string; assignedRoles?: (string | object)[] }, payloadReq)
  return NextResponse.json(perms)
}
