import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { findPlayersOnline } from '@/lib/ddnet-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 1,
    })

    if (!currentUser.friend || currentUser.friend.length === 0) {
      return NextResponse.json({ friends: [] })
    }

    // Get friend ingame nicknames for DDNet API lookup
    const friendNicknames = currentUser.friend.map((f) => {
      const friendUser = typeof f.user === 'string' ? null : f.user
      return friendUser?.ingameNick || ''
    }).filter(Boolean)

    const onlineStatuses = await findPlayersOnline(friendNicknames)

    // Merge friend data with online status
    const friends = currentUser.friend.map((f) => {
      const friendUser = typeof f.user === 'string' ? null : f.user
      const nickname = friendUser?.ingameNick || ''
      const onlineStatus = onlineStatuses.find(
        (s) => s.name.toLowerCase() === nickname.toLowerCase(),
      )

      // Prefer database skin (always available), fall back to online skin
      const dbSkin = friendUser?.ingameStats?.skin
      const skin = dbSkin?.name
        ? {
            name: dbSkin.name,
            colorBody: dbSkin.color_body || 0,
            colorFeet: dbSkin.color_feet || 0,
          }
        : onlineStatus?.skin || null

      return {
        userId: friendUser?.id || f.user,
        ingameNick: friendUser?.ingameNick,
        roles: friendUser?.roles || 'player',
        primaryRole: (friendUser as any)?.primaryRole || null,
        nickname: f.nickname || nickname,
        addedAt: f.addedAt,
        online: onlineStatus?.online || false,
        afk: onlineStatus?.afk ?? false,
        platformOnline: friendUser?.lastSeenAt
          ? (Date.now() - new Date(friendUser.lastSeenAt).getTime()) < 2 * 60_000
          : false,
        server: onlineStatus?.server,
        skin,
      }
    })

    return NextResponse.json({ friends })
  } catch (error: unknown) {
    console.error('[API] Error fetching friends online:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch friends' },
      { status: 500 },
    )
  }
}
