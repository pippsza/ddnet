import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'crypto'

/**
 * POST /api/client/token — Generate or regenerate a client linking token.
 * Requires Payload session auth (web login cookie).
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = crypto.randomBytes(32).toString('hex')

    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { clientToken: token },
    })

    return NextResponse.json({ token })
  } catch (error: any) {
    console.error('[API] Error generating client token:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/client/token — Check if current user has a client token.
 * Returns { hasToken: boolean }, never exposes the token itself.
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user with overrideAccess to read the clientToken field
    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      depth: 0,
    })

    return NextResponse.json({
      hasToken: !!fullUser.clientToken,
    })
  } catch (error: any) {
    console.error('[API] Error checking client token:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check token' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/client/token — Burn (revoke) the current client token.
 */
export async function DELETE(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { clientToken: null as any },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error deleting client token:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete token' },
      { status: 500 },
    )
  }
}
