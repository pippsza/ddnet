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
  invitedPlayerId?: string
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

    // Block if user already has an active game (bingo or race)
    if (user.activeGame) {
      return NextResponse.json(
        { error: 'You already have an active game. Finish or leave it before creating a new one.' },
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

    // Send invite notification if a player was invited
    let inviteSent = false
    if (body.invitedPlayerId) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: body.invitedPlayerId,
            type: 'game_invite',
            title: 'Race Invite',
            message: `${user.ingameNick || user.username} invited you to ${body.title}`,
            actionUrl: `/app/race/${race.id}`,
            relatedGame: { relationTo: 'races', value: race.id },
            relatedUser: user.id,
            metadata: {
              gameType: 'race',
              inviteCode: race.inviteCode,
            },
          },
        })
        inviteSent = true
      } catch (inviteErr) {
        console.error('[API] Error sending race invite notification:', inviteErr)
      }
    }

    return NextResponse.json({
      success: true,
      race: {
        id: race.id,
        title: race.title,
        inviteCode: race.inviteCode,
        isPublic: race.isPublic,
      },
      inviteSent,
    })
  } catch (error: unknown) {
    console.error('[API] Error creating race:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create race' },
      { status: 500 },
    )
  }
}
