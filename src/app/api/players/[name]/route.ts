import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params
    const playerName = decodeURIComponent(name)

    const payload = await getPayload({ config })

    // Check if registered user
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { username: { equals: playerName } },
      limit: 1,
      depth: 1,
    })

    const registeredUser = users[0] || null

    // Fetch DDNet data
    let ddnetData = null
    try {
      const res = await fetch(
        `https://ddnet.org/players/?json2=${encodeURIComponent(playerName)}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const data = await res.json()
        if (data.player) {
          ddnetData = {
            player: data.player,
            points: data.points || {},
            firstFinish: data.first_finish || null,
            lastFinishes: (data.last_finishes || []).slice(0, 20),
            favoritePartners: (data.favorite_partners || []).slice(0, 10),
            types: data.types || {},
            activity: data.activity || [],
            hoursPlayed: data.hours_played_past_365_days || 0,
          }
        }
      }
    } catch {
      // DDNet API failure is non-critical
    }

    if (!registeredUser && !ddnetData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    return NextResponse.json({
      registered: registeredUser
        ? {
            id: registeredUser.id,
            username: registeredUser.username,
            isVerified: registeredUser.isSystemVerified || false,
            skin: registeredUser.ingameStats?.skin || null,
            bingo: registeredUser.bingo || null,
            points: registeredUser.ingameStats?.points || 0,
            rank: registeredUser.ingameStats?.rank || null,
          }
        : null,
      ddnet: ddnetData,
    })
  } catch (error) {
    console.error('[API] Player detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
  }
}
