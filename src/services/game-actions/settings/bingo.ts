import type { Bingo } from '@/payload-types'
import type { GameContext, ActionResult, SettingsOptions } from '../types'
import { resolveUserId } from '../helpers'
import { generateBingoGrid, validateGridOptions } from '@/services/bingo/gridGenerator'
import { generateKoGBingoGrid, validateKoGGridOptions } from '@/services/kog/gridGenerator'
import { isKoGCategory } from '@/lib/kog-constants'

interface BingoSettingsBody {
  title?: string
  category?: string
  mode?: 'solo' | 'team'
  gridSize?: '3x3' | '5x5' | '7x7'
  winCondition?: 'line' | 'cross' | 'full_house'
  difficultyMin?: number
  difficultyMax?: number
  isPublic?: boolean
}

export async function handleBingoSettings(
  ctx: GameContext,
  body: BingoSettingsBody,
  options: SettingsOptions,
): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx
  const bingoGame = game as Bingo

  const creatorId = resolveUserId(bingoGame.createdBy)
  if (creatorId !== user.id) {
    return { error: 'Only the creator can update settings', status: 403 }
  }

  const oppositeSource = options.callerSource === 'client' ? 'web' : 'client'
  if (bingoGame.createdVia === oppositeSource) {
    return {
      error: `Settings for this game can only be changed from the ${oppositeSource}`,
      status: 403,
    }
  }

  if (bingoGame.gameStatus !== 'waiting' && bingoGame.gameStatus !== 'ready') {
    return { error: 'Cannot update settings after game has started', status: 400 }
  }

  const updateData: Record<string, any> = {}

  if (bingoGame.gameStatus === 'ready') {
    updateData.gameStatus = 'waiting'
  }

  if (options.callerSource === 'web' && body.title !== undefined) {
    updateData.title = body.title
  }
  if (body.winCondition !== undefined) updateData.winCondition = body.winCondition
  if (body.isPublic !== undefined) updateData.isPublic = body.isPublic

  // Check if grid-affecting settings changed
  const newCategory = body.category ?? bingoGame.category
  const newGridSize = body.gridSize ?? bingoGame.gridSize
  const newDiffMin = body.difficultyMin ?? bingoGame.difficultyRange?.min ?? 0
  const newDiffMax = body.difficultyMax ?? bingoGame.difficultyRange?.max ?? 5

  const gridChanged =
    body.category !== undefined ||
    body.gridSize !== undefined ||
    body.difficultyMin !== undefined ||
    body.difficultyMax !== undefined

  if (gridChanged) {
    const useKoG = isKoGCategory(newCategory)
    const validation = useKoG
      ? validateKoGGridOptions({ category: newCategory, gridSize: newGridSize, difficultyMin: newDiffMin, difficultyMax: newDiffMax })
      : validateGridOptions({ category: newCategory, gridSize: newGridSize, difficultyMin: newDiffMin, difficultyMax: newDiffMax })

    if (!validation.valid) {
      return { error: validation.error!, status: 400 }
    }

    const maps = useKoG
      ? await generateKoGBingoGrid({ category: newCategory, gridSize: newGridSize, difficultyMin: newDiffMin, difficultyMax: newDiffMax })
      : await generateBingoGrid({ category: newCategory, gridSize: newGridSize, difficultyMin: newDiffMin, difficultyMax: newDiffMax })

    updateData.maps = maps
    updateData.category = newCategory
    updateData.gridSize = newGridSize
    updateData.difficultyRange = { min: newDiffMin, max: newDiffMax }

    const teams = JSON.parse(JSON.stringify(bingoGame.teams))
    for (const team of teams) {
      team.completedCells = []
    }
    updateData.teams = teams
  }

  // Handle mode change
  if (body.mode !== undefined && body.mode !== bingoGame.mode) {
    updateData.mode = body.mode
    const teams = updateData.teams
      ? updateData.teams
      : JSON.parse(JSON.stringify(bingoGame.teams))

    if (body.mode === 'team' && teams.length === 1) {
      teams.push({
        teamName: 'Team 2',
        color: 'blue',
        players: [],
        completedCells: [],
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

  // Reset all players' ready status when settings change
  if (bingoGame.gameStatus === 'ready') {
    const teamsData = updateData.teams ?? JSON.parse(JSON.stringify(bingoGame.teams))
    for (const team of teamsData) {
      for (const p of team.players ?? []) {
        p.isReady = false
      }
      team.teamStatus = 'not_ready'
    }
    updateData.teams = teamsData
  }

  await payload.update({
    collection,
    id: gameId,
    data: updateData,
  })

  return { success: true, data: { success: true } }
}
