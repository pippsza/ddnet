import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { nanoid } from 'nanoid'
import type { Race } from '@/payload-types'
import { isCustomCategory } from '@/lib/category-helpers'

const MAX_ACTIVE_GAMES_PER_USER = parseInt(process.env.MAX_ACTIVE_GAMES_PER_USER || '1')

interface CreateRaceRequest {
  title: string
  category: string
  totalRounds: number
  server: { ip: string; port: number; name?: string }
  isPublic: boolean
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check verification
    if (!user.isSystemVerified) {
      return NextResponse.json({ error: 'You must verify your nickname first' }, { status: 400 })
    }

    const body: CreateRaceRequest = await req.json()

    if (!body.title || !body.category || !body.totalRounds || !body.server?.ip) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (body.totalRounds < 1) {
      return NextResponse.json({ error: 'Total rounds must be at least 1' }, { status: 400 })
    }

    // Validate totalRounds against available maps for custom categories
    if (isCustomCategory(body.category)) {
      const customCats = await payload.findGlobal({ slug: 'custom-categories' })
      const cat = (customCats as any)?.categories?.find((c: any) => c.slug === body.category)
      if (!cat) {
        return NextResponse.json({ error: `Category "${body.category}" not found` }, { status: 400 })
      }
      const availableMaps = cat.maps?.length || 0
      if (body.totalRounds > availableMaps) {
        return NextResponse.json(
          { error: `Not enough maps. Category has ${availableMaps} maps but ${body.totalRounds} rounds requested.` },
          { status: 400 },
        )
      }
    }

    // Check active games limit
    const { docs: existingGames } = await payload.find({
      collection: 'races',
      where: {
        and: [
          { createdBy: { equals: user.id } },
          { status: { in: ['waiting', 'ready', 'in_progress'] } },
        ],
      },
    })

    if (existingGames.length >= MAX_ACTIVE_GAMES_PER_USER) {
      return NextResponse.json(
        { error: `You can only have ${MAX_ACTIVE_GAMES_PER_USER} active game(s) at a time` },
        { status: 400 },
      )
    }

    const race = await payload.create({
      collection: 'races',
      data: {
        title: body.title,
        category: body.category as Race['category'],
        totalRounds: body.totalRounds,
        server: {
          ip: body.server.ip,
          port: body.server.port || 8303,
          name: body.server.name,
        },
        isPublic: body.isPublic,
        currentRound: 0,
        players: [
          {
            user: user.id,
            ingameNick: user.ingameNick,
            roundsWon: 0,
            isReady: false,
          },
        ],
        rounds: [],
        status: 'waiting',
        createdBy: user.id,
        inviteCode: body.isPublic ? undefined : nanoid(8),
      },
    })

    // Update user's active game reference
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        activeGame: { relationTo: 'races', value: race.id },
      },
    })

    return NextResponse.json({
      success: true,
      race: {
        id: race.id,
        title: race.title,
        inviteCode: race.inviteCode,
        isPublic: race.isPublic,
      },
    })
  } catch (error: unknown) {
    console.error('[API] Error creating race:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create race' },
      { status: 500 },
    )
  }
}
