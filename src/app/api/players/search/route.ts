import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q')?.trim()
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '12', 10) || 12))
    const payload = await getPayload({ config })

    // Search registered users by ingameNick
    const { docs: registeredUsers, totalDocs, totalPages } = await payload.find({
      collection: 'users',
      where: query
        ? { ingameNick: { contains: query } }
        : {},
      limit,
      page,
      sort: '-createdAt',
      depth: 1,
    })

    const registered = registeredUsers.map((u) => {
      const rawSkin = u.ingameStats?.skin
      return {
        id: u.id,
        name: u.ingameNick,
        roles: u.roles || 'player',
        primaryRole: (u as any).primaryRole || null,
        points: u.ingameStats?.points || 0,
        rank: u.ingameStats?.rank || undefined,
        isVerified: u.isSystemVerified || false,
        lastSeenAt: u.lastSeenAt || null,
        skin: rawSkin?.name
          ? {
              name: rawSkin.name,
              colorBody: rawSkin.color_body || 0,
              colorFeet: rawSkin.color_feet || 0,
            }
          : undefined,
        isRegistered: true,
      }
    })

    // Search DDNet API if query provided
    const ddnetResults: Array<{
      name: string
      points: number
      rank?: number
      skin?: { name: string; colorBody: number; colorFeet: number }
      isRegistered: false
    }> = []

    if (query) {
      try {
        const res = await fetch(
          `https://ddnet.org/players/?json2=${encodeURIComponent(query)}`,
          { cache: 'no-store' },
        )
        if (res.ok) {
          const data = await res.json()
          if (data.player) {
            // Check if already in registered list
            const alreadyRegistered = registered.some(
              (r) => r.name?.toLowerCase() === data.player.toLowerCase(),
            )
            if (!alreadyRegistered) {
              ddnetResults.push({
                name: data.player,
                points: data.points?.points || 0,
                rank: data.points?.rank || undefined,
                skin: undefined,
                isRegistered: false,
              })
            }
          }
        }
      } catch {
        // DDNet API failure is non-critical
      }
    }

    return NextResponse.json({ registered, ddnet: ddnetResults, totalDocs, totalPages, page })
  } catch (error) {
    console.error('[API] Player search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
