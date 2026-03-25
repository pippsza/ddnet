import type { Race } from '@/payload-types'
import type { GameContext, ActionResult, SettingsOptions } from '../types'
import { resolveUserId } from '../helpers'
import { validatePathOptions } from '@/services/race/pathGenerator'

interface RaceSettingsBody {
  title?: string
  category?: string
  mode?: 'solo' | 'team'
  categoryMode?: 'selected' | 'free'
  pathLength?: number
  difficultyMin?: number
  difficultyMax?: number
  isPublic?: boolean
  serverIp?: string
  serverPort?: number
  serverName?: string
}

export async function handleRaceSettings(
  ctx: GameContext,
  body: RaceSettingsBody,
  options: SettingsOptions,
): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx
  const raceGame = game as Race

  const creatorId = resolveUserId(raceGame.createdBy)
  if (creatorId !== user.id) {
    return { error: 'Only the creator can update settings', status: 403 }
  }

  const oppositeSource = options.callerSource === 'client' ? 'web' : 'client'
  if (raceGame.createdVia === oppositeSource) {
    return {
      error: `Settings for this game can only be changed from the ${oppositeSource}`,
      status: 403,
    }
  }

  if (raceGame.gameStatus !== 'waiting' && raceGame.gameStatus !== 'ready') {
    return { error: 'Cannot update settings after race has started', status: 400 }
  }

  const updateData: Record<string, any> = {}

  if (raceGame.gameStatus === 'ready') {
    updateData.gameStatus = 'waiting'
  }

  if (options.callerSource === 'web' && body.title !== undefined) {
    updateData.title = body.title
  }
  if (body.isPublic !== undefined) updateData.isPublic = body.isPublic
  if (body.categoryMode !== undefined) updateData.categoryMode = body.categoryMode

  // Server updates (web only)
  if (
    options.callerSource === 'web' &&
    (body.serverIp !== undefined || body.serverPort !== undefined || body.serverName !== undefined)
  ) {
    updateData.server = {
      ip: body.serverIp ?? raceGame.server?.ip ?? '',
      port: body.serverPort ?? raceGame.server?.port ?? 8303,
      name: body.serverName ?? raceGame.server?.name ?? '',
    }
  }

  // Check if path-affecting settings changed
  const newCategory = body.category ?? raceGame.category
  const newPathLength = body.pathLength ?? raceGame.pathLength
  const newDiffMin = body.difficultyMin ?? raceGame.difficultyRange?.min ?? 0
  const newDiffMax = body.difficultyMax ?? raceGame.difficultyRange?.max ?? 5
  const newCategoryMode = body.categoryMode ?? raceGame.categoryMode

  const pathChanged =
    body.category !== undefined ||
    body.pathLength !== undefined ||
    body.difficultyMin !== undefined ||
    body.difficultyMax !== undefined ||
    body.categoryMode !== undefined

  if (pathChanged) {
    updateData.category = newCategory
    updateData.pathLength = newPathLength
    updateData.difficultyRange = { min: newDiffMin, max: newDiffMax }

    if (newCategoryMode !== 'free') {
      const validation = validatePathOptions({
        category: newCategory,
        pathLength: newPathLength,
        difficultyMin: newDiffMin,
        difficultyMax: newDiffMax,
      })
      if (!validation.valid) {
        return { error: validation.error!, status: 400 }
      }
    }

    updateData.maps = []
  }

  // Handle mode change
  if (body.mode !== undefined && body.mode !== raceGame.mode) {
    updateData.mode = body.mode
    const teams = updateData.teams
      ? updateData.teams
      : JSON.parse(JSON.stringify(raceGame.teams))

    if (body.mode === 'team' && teams.length === 1) {
      teams.push({
        teamName: 'Team 2',
        color: 'blue',
        players: [],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      })
      teams[0].teamName = 'Team 1'
    } else if (body.mode === 'solo' && teams.length > 1) {
      const team2Players = teams[1]?.players || []
      const team2Invites = teams[1]?.pendingInvites || []
      if (team2Players.length > 0 || team2Invites.length > 0) {
        return {
          error: 'Cannot switch to solo while Team 2 has players or pending invites',
          status: 400,
        }
      }
      teams.splice(1)
      teams[0].teamName = `${user.ingameNick || user.username}'s Team`
    }

    updateData.teams = teams
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, data: { success: true } }
  }

  // Reset ready status when settings change
  if (raceGame.gameStatus === 'ready') {
    const teamsData = updateData.teams ?? JSON.parse(JSON.stringify(raceGame.teams))
    for (const team of teamsData) {
      for (const p of team.players ?? []) {
        p.isReady = false
      }
      team.teamStatus = 'not_ready'
    }
    updateData.teams = teamsData
  }

  await payload.update({ collection, id: gameId, data: updateData })

  return { success: true, data: { success: true } }
}
