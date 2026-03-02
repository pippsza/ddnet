import type { Payload } from 'payload'
import type { User, Race } from '@/payload-types'
import type { ActionResult, CreateOptions } from '../types'
import { validatePathOptions } from '@/services/race/pathGenerator'
import { checkAndClearStaleActiveGame } from '../helpers'

interface CreateRaceBody {
  title: string
  mode?: 'solo' | 'team'
  categoryMode?: 'selected' | 'free'
  category?: string
  pathLength?: number
  isPublic?: boolean
  difficultyMin?: number
  difficultyMax?: number
}

export async function handleCreateRace(
  auth: { user: User; payload: Payload },
  body: CreateRaceBody,
  options: CreateOptions,
): Promise<ActionResult> {
  const { user, payload } = auth

  if (!user.isSystemVerified) {
    return { error: 'You must verify your nickname first', status: 400 }
  }

  if (!body.title) {
    return { error: 'Missing required fields', status: 400 }
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
      return { error: validation.error!, status: 400 }
    }
  }

  const { hasActiveGame } = await checkAndClearStaleActiveGame(payload, user)
  if (hasActiveGame) {
    return {
      error: 'You already have an active game. Finish or leave it before creating a new one.',
      status: 400,
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

  const raceData: Record<string, any> = {
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
    createdVia: options.createdVia,
    maps,
    teams,
    gameStatus: 'waiting',
    currentStep: 0,
  }

  if (options.server) {
    raceData.server = {
      ip: options.server.ip || '',
      port: options.server.port || 8303,
      name: options.server.name,
    }
  }

  const race = await payload.create({
    collection: 'races',
    data: raceData as Race,
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { activeGame: { relationTo: 'races', value: race.id } },
  })

  // Send invite notifications (web only)
  if (options.invitedPlayerId || options.invitedTeammateId) {
    const inviteTargets: { id: string; teamIndex: number }[] = []
    if (options.invitedTeammateId) inviteTargets.push({ id: options.invitedTeammateId, teamIndex: 0 })
    if (options.invitedPlayerId) inviteTargets.push({ id: options.invitedPlayerId, teamIndex: 1 })

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
  }

  return {
    success: true,
    data: {
      success: true,
      race: {
        id: race.id,
        title: race.title,
        mode: race.mode,
        inviteCode: race.inviteCode,
        isPublic: race.isPublic,
      },
    },
  }
}
