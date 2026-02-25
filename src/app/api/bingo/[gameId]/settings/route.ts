import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { generateBingoGrid, validateGridOptions } from '@/services/bingo/gridGenerator'
import type { Bingo } from '@/payload-types'

interface SettingsUpdate {
  title?: string
  mode?: 'solo' | 'team'
  category?: string
  subcategory?: string
  gridSize?: '3x3' | '5x5' | '7x7'
  winCondition?: 'line' | 'cross' | 'full_house'
  difficultyMin?: number
  difficultyMax?: number
  isPublic?: boolean
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const body: SettingsUpdate = await req.json()

    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 1,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can update settings' }, { status: 403 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Cannot update settings after game has started' }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, any> = {}

    // If game was 'ready', reset to 'waiting' since settings changed
    if (game.gameStatus === 'ready') {
      updateData.gameStatus = 'waiting'
    }

    if (body.title !== undefined) updateData.title = body.title
    if (body.winCondition !== undefined) updateData.winCondition = body.winCondition
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic

    // Check if grid-affecting settings changed
    const newCategory = body.category ?? game.category
    const newSubcategory = body.subcategory ?? game.subcategory ?? undefined
    const newGridSize = body.gridSize ?? game.gridSize
    const newDiffMin = body.difficultyMin ?? game.difficultyRange?.min ?? 0
    const newDiffMax = body.difficultyMax ?? game.difficultyRange?.max ?? 5

    const gridChanged =
      body.category !== undefined ||
      body.subcategory !== undefined ||
      body.gridSize !== undefined ||
      body.difficultyMin !== undefined ||
      body.difficultyMax !== undefined

    if (gridChanged) {
      const validation = validateGridOptions({
        category: newCategory,
        subcategory: newSubcategory,
        gridSize: newGridSize,
        difficultyMin: newDiffMin,
        difficultyMax: newDiffMax,
      })

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      const maps = await generateBingoGrid({
        category: newCategory,
        subcategory: newSubcategory,
        gridSize: newGridSize,
        difficultyMin: newDiffMin,
        difficultyMax: newDiffMax,
      })

      updateData.maps = maps
      updateData.category = newCategory
      updateData.subcategory = newSubcategory
      updateData.gridSize = newGridSize
      updateData.difficultyRange = { min: newDiffMin, max: newDiffMax }

      // Reset completed cells on all teams when grid changes
      const teams = JSON.parse(JSON.stringify(game.teams))
      for (const team of teams) {
        team.completedCells = []
      }
      updateData.teams = teams
    }

    // Handle mode change
    if (body.mode !== undefined && body.mode !== game.mode) {
      updateData.mode = body.mode
      const teams = updateData.teams
        ? updateData.teams
        : JSON.parse(JSON.stringify(game.teams))

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
          return NextResponse.json(
            { error: 'Cannot switch to solo while Team 2 has players or pending invites' },
            { status: 400 },
          )
        }
        teams.splice(1)
        teams[0].teamName = `${user.username}'s Team`
      }

      updateData.teams = teams
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true })
    }

    // Reset all players' ready status when settings change
    if (game.gameStatus === 'ready') {
      const teamsData = updateData.teams ?? JSON.parse(JSON.stringify(game.teams))
      for (const team of teamsData) {
        for (const p of team.players ?? []) {
          p.isReady = false
        }
        team.teamStatus = 'not_ready'
      }
      updateData.teams = teamsData
    }

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error updating bingo settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 },
    )
  }
}
