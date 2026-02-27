import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { findPlayersOnline } from '@/lib/ddnet-helpers'

export const dynamic = 'force-dynamic'

/** GET — list watched players with live online status */
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { docs: entries } = await payload.find({
      collection: 'watched-players',
      where: { user: { equals: user.id } },
      sort: '-addedAt',
      limit: 30,
      overrideAccess: false,
      user,
    })

    if (entries.length === 0) {
      return NextResponse.json({ players: [] })
    }

    // Batch query online status
    const nicknames = entries.map((e) => e.nickname)
    const onlineStatuses = await findPlayersOnline(nicknames)

    // Look up registered users by ingameNick for role/verification badges
    const { docs: registeredUsers } = await payload.find({
      collection: 'users',
      where: { ingameNick: { in: nicknames } },
      limit: nicknames.length,
      depth: 0,
      overrideAccess: true,
    })
    const regMap = new Map(
      registeredUsers.map((u: any) => [u.ingameNick?.toLowerCase(), u]),
    )

    const players = entries.map((entry) => {
      const status = onlineStatuses.find(
        (s) => s.name.toLowerCase() === entry.nickname.toLowerCase(),
      )
      const regUser = regMap.get(entry.nickname.toLowerCase()) as any

      // Prefer DB skin over live skin
      const dbSkin = regUser?.ingameStats?.skin
      const skin = dbSkin?.name
        ? { name: dbSkin.name, colorBody: dbSkin.color_body || 0, colorFeet: dbSkin.color_feet || 0 }
        : status?.skin ?? null

      return {
        id: entry.id,
        nickname: entry.nickname,
        notifyOnline: entry.notifyOnline,
        addedAt: entry.addedAt,
        online: status?.online ?? false,
        afk: status?.afk ?? false,
        server: status?.server ?? null,
        skin,
        isVerified: regUser?.isSystemVerified ?? false,
        role: regUser?.primaryRole ?? null,
      }
    })

    return NextResponse.json({ players })
  } catch (error) {
    console.error('[API] Error fetching watched players:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch watched players' },
      { status: 500 },
    )
  }
}

/** POST — add a player to the watchlist */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { nickname } = await req.json()
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 })
    }

    const trimmed = nickname.trim()

    // Check for duplicate
    const { totalDocs } = await payload.find({
      collection: 'watched-players',
      where: {
        and: [
          { user: { equals: user.id } },
          { nickname: { equals: trimmed } },
        ],
      },
      limit: 0,
      overrideAccess: false,
      user,
    })

    if (totalDocs > 0) {
      return NextResponse.json({ error: 'Player already in your watchlist' }, { status: 409 })
    }

    const doc = await payload.create({
      collection: 'watched-players',
      data: {
        user: user.id,
        nickname: trimmed,
        notifyOnline: true,
        lastKnownOnline: false,
        addedAt: new Date().toISOString(),
      },
      overrideAccess: false,
      user,
    })

    return NextResponse.json({ doc })
  } catch (error) {
    console.error('[API] Error adding watched player:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add player' },
      { status: 400 },
    )
  }
}
