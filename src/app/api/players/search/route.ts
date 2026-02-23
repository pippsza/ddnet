import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q')?.trim()
    const payload = await getPayload({ config })

    // Search registered users by ingameNick
    const { docs: registeredUsers } = await payload.find({
      collection: 'users',
      where: query
        ? { ingameNick: { contains: query } }
        : {},
      limit: query ? 20 : 12,
      sort: '-createdAt',
    })

    const registered = registeredUsers.map((u) => ({
      name: u.ingameNick,
      points: u.ingameStats?.points || 0,
      rank: u.ingameStats?.rank || undefined,
      isVerified: u.isSystemVerified || false,
      skin: u.ingameStats?.skin || undefined,
      isRegistered: true,
    }))

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
                points: data.points?.total || 0,
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

    return NextResponse.json({ registered, ddnet: ddnetResults })
  } catch (error) {
    console.error('[API] Player search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
