import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
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
  server?: { ip?: string; port?: number; name?: string }
  invitedPlayerId?: string
  invitedTeammateId?: string
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.isSystemVerified) {
      return NextResponse.json({ error: 'You must verify your nickname first' }, { status: 400 })
    }

    const body: CreateRaceRequest = await req.json()

    if (!body.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const categoryMode = body.categoryMode || 'selected'
    const category = body.category || 'novice'

    // Validate path options for selected mode
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

    // Maps are generated at game start, not during creation
    const pathLength = body.pathLength || 5
    const maps: Race['maps'] = []

    // Create team structure
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
        server: {
          ip: body.server?.ip || '',
          port: body.server?.port || 8303,
          name: body.server?.name,
        },
        createdBy: user.id,
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

    // Send invite notifications
    const inviteTargets: { id: string; teamIndex: number }[] = []
    if (body.invitedTeammateId) inviteTargets.push({ id: body.invitedTeammateId, teamIndex: 0 })
    if (body.invitedPlayerId) inviteTargets.push({ id: body.invitedPlayerId, teamIndex: 1 })

    for (const target of inviteTargets) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: target.id,
            type: 'game_invite',
            title: 'Race Invite',
            message: `${user.ingameNick || user.username} invited you to ${body.title}`,
            actionUrl: `/app/race/${race.id}?team=${target.teamIndex}`,
            relatedGame: { relationTo: 'races', value: race.id },
            relatedUser: user.id,
            metadata: {
              gameType: 'race',
              inviteCode: race.inviteCode,
              teamIndex: target.teamIndex,
            },
          },
        })
      } catch (inviteErr) {
        console.error('[API] Error sending race invite notification:', inviteErr)
      }
    }

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
    console.error('[API] Error creating race:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create race' },
      { status: 500 },
    )
  }
}
