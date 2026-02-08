import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all races where user is a player
    const { docs: races } = await payload.find({
      collection: 'races',
      where: {
        'players.user': { equals: user.id },
      },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
    })

    return NextResponse.json({ races })
  } catch (error) {
    console.error('[API] Error fetching my races:', error)
    return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
  }
}
