import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * POST /api/client/link — Link a DDNet client to a web account using a token.
 * Called by the C++ client. No Payload session required — authenticated by the token itself.
 *
 * Body: { token: "abc...", playerName: "EmpaTee" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, playerName } = body as { token?: string; playerName?: string }

    if (!token || !playerName) {
      return NextResponse.json(
        { error: 'Missing required fields: token, playerName' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    // Find user by clientToken
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { clientToken: { equals: token } },
      overrideAccess: true,
      limit: 1,
      depth: 0,
    })

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 },
      )
    }

    const user = users[0] as User

    // Verify player name matches the account's ingameNick
    if (
      !user.ingameNick ||
      user.ingameNick.toLowerCase() !== playerName.toLowerCase()
    ) {
      return NextResponse.json(
        { error: 'Player name does not match account' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      ingameNick: user.ingameNick,
    })
  } catch (error: any) {
    console.error('[API] Error linking client:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to link account' },
      { status: 500 },
    )
  }
}
