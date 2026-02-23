import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getPlayerSkinInfo } from '@/lib/ddnet-helpers'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Fetch full user with populated relationships
    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 1,
    })

    // If skin is missing and user has ingameNick, try to fetch via DDStats/Master Server
    const hasSkin = fullUser.ingameStats?.skin?.name
    if (!hasSkin && fullUser.ingameNick) {
      try {
        const skinInfo = await getPlayerSkinInfo(fullUser.ingameNick)
        if (skinInfo) {
          await payload.update({
            collection: 'users',
            id: user.id,
            overrideAccess: true,
            data: {
              ingameStats: {
                ...fullUser.ingameStats,
                skin: skinInfo,
              },
            },
          })
          fullUser.ingameStats = {
            ...fullUser.ingameStats,
            skin: skinInfo as any,
          }
        }
      } catch {
        // Skin fetch is non-critical
      }
    }

    return NextResponse.json({ user: fullUser })
  } catch (error: unknown) {
    console.error('[API] Error fetching current user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user' },
      { status: 500 },
    )
  }
}
