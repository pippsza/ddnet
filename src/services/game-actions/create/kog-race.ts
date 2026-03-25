import type { Payload } from 'payload'
import type { User, KogRace } from '@/payload-types'
import type { ActionResult, CreateOptions } from '../types'
import { validateKoGPathOptions } from '@/services/kog/pathGenerator'
import { checkAndClearStaleActiveGame } from '../helpers'

interface CreateKoGRaceBody {
  title: string
  mode?: 'solo' | 'team'
  category?: string
  pathLength?: number
  isPublic?: boolean
  difficultyMin?: number
  difficultyMax?: number
}

export async function handleCreateKoGRace(
  auth: { user: User; payload: Payload },
  body: CreateKoGRaceBody,
  options: CreateOptions,
): Promise<ActionResult> {
  const { user, payload } = auth

  if (!body.title) {
    return { error: 'Title is required', status: 400 }
  }

  const mode = body.mode || 'solo'
  const category = body.category || 'kog_main'
  const pathLength = body.pathLength || 5
  const difficultyMin = body.difficultyMin ?? 0
  const difficultyMax = body.difficultyMax ?? 5

  const validation = validateKoGPathOptions({
    category,
    pathLength,
    difficultyMin,
    difficultyMax,
  })
  if (!validation.valid) {
    return { error: validation.error!, status: 400 }
  }

  const { hasActiveGame } = await checkAndClearStaleActiveGame(payload, user)
  if (hasActiveGame) {
    return {
      error: 'You already have an active game. Finish or leave it before creating a new one.',
      status: 400,
    }
  }

  const teams: KogRace['teams'] = [
    {
      teamName: mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
      color: 'red',
      players: [{ user: user.id, isReady: true }],
      score: 0,
      completedSteps: [],
      teamStatus: 'not_ready',
    },
  ]

  if (mode === 'team') {
    teams.push({
      teamName: 'Team 2',
      color: 'blue',
      players: [],
      score: 0,
      completedSteps: [],
      teamStatus: 'not_ready',
    })
  }

  const game = await payload.create({
    collection: 'kog-races',
    data: {
      title: body.title,
      mode,
      category: category as KogRace['category'],
      pathLength,
      isPublic: body.isPublic ?? false,
      difficultyRange: { min: difficultyMin, max: difficultyMax },
      createdBy: user.id,
      createdVia: options.createdVia,
      maps: [], // Maps generated at game start
      teams,
      gameStatus: 'waiting',
      currentStep: 0,
    },
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { activeGame: { relationTo: 'kog-races', value: game.id } },
  })

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
            title: 'KoG Race Invite',
            message: `${user.ingameNick || user.username} invited you to ${body.title}`,
            actionUrl: `/app/kog-race/${game.id}?team=${target.teamIndex}`,
            relatedGame: { relationTo: 'kog-races', value: game.id },
            relatedUser: user.id,
            metadata: {
              gameType: 'kog-race',
              inviteCode: game.inviteCode,
              teamIndex: target.teamIndex,
            },
          },
        })
      } catch (inviteErr) {
        console.error('[API] Error sending KoG race invite notification:', inviteErr)
      }
    }
  }

  return {
    success: true,
    data: {
      success: true,
      race: {
        id: game.id,
        title: game.title,
        mode: game.mode,
        inviteCode: game.inviteCode,
        isPublic: game.isPublic,
      },
    },
  }
}
