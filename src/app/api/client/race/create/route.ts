import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'
import { validatePathOptions } from '@/services/race/pathGenerator'
import type { Race } from '@/payload-types'

interface CreateRaceRequest {
  title: string
  mode?: 'solo' | 'team'
  categoryMode?: 'selected' | 'free'
  category?: string
  pathLength?: number
  isPublic?: boolean
  difficultyMin?: number
  difficultyMax?: number
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateClientToken(req)
    if (auth instanceof NextResponse) return auth
    const { user, payload } = auth

    if (!user.isSystemVerified) {
      return NextResponse.json({ error: 'You must verify your nickname first' }, { status: 400 })
    }

    const body: CreateRaceRequest = await req.json()

    if (!body.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const categoryMode = body.categoryMode || 'selected'
    const category = body.category || 'novice'

    if (categoryMode !== 'free') {
      const validation = validatePathOptions({
        category,
        pathLength: body.pathLength || 5,
        difficultyMin: body.difficultyMin || 0,
        difficultyMax: body.difficultyMax || 5,
      })
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    // Block if user already has an active game
    if (user.activeGame) {
      const ref = user.activeGame as { relationTo: string; value: string | { id: string } }
      const refId = typeof ref.value === 'object' ? ref.value.id : ref.value
      let isStale = false
      try {
        const activeDoc = await payload.findByID({
          collection: ref.relationTo as 'bingo' | 'races',
          id: refId,
          depth: 0,
        })
        const status = (activeDoc as any)?.gameStatus
        if (!activeDoc || status === 'completed' || status === 'cancelled') {
          isStale = true
        }
      } catch {
        isStale = true
      }

      if (isStale) {
        await payload.update({ collection: 'users', id: user.id, data: { activeGame: null } })
      } else {
        return NextResponse.json(
          { error: 'You already have an active game. Finish or leave it before creating a new one.' },
          { status: 400 },
        )
      }
    }

    const pathLength = body.pathLength || 5
    const maps: Race['maps'] = []

    const teams: Race['teams'] = [
      {
        teamName: body.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: 'red',
        players: [{ user: user.id, isReady: true }],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      },
    ]

    if (body.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: 'blue',
        players: [],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      })
    }

    const race = await payload.create({
      collection: 'races',
      data: {
        title: body.title,
        mode: body.mode || 'solo',
        categoryMode,
        category: category as Race['category'],
        pathLength,
        isPublic: body.isPublic ?? false,
        difficultyRange: {
          min: body.difficultyMin || 0,
          max: body.difficultyMax || 5,
        },
        createdBy: user.id,
        createdVia: 'client',
        maps,
        teams,
        gameStatus: 'waiting',
        currentStep: 0,
      },
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: { relationTo: 'races', value: race.id } },
    })

    return NextResponse.json({
      success: true,
      race: {
        id: race.id,
        title: race.title,
        mode: race.mode,
        inviteCode: race.inviteCode,
        isPublic: race.isPublic,
      },
    })
  } catch (error: any) {
    console.error('[API] Error creating race (client):', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create race' },
      { status: 500 },
    )
  }
}
