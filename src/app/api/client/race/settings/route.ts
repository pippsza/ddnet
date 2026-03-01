import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'
import { validatePathOptions } from '@/services/race/pathGenerator'

interface SettingsUpdate {
  gameId: string
  category?: string
  mode?: 'solo' | 'team'
  categoryMode?: 'selected' | 'free'
  pathLength?: number
  difficultyMin?: number
  difficultyMax?: number
  isPublic?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateClientToken(req)
    if (authResult instanceof NextResponse) return authResult
    const { user, payload } = authResult

    const body: SettingsUpdate = await req.json()
    const { gameId } = body

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 1 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can update settings' }, { status: 403 })
    }

    if (game.createdVia === 'web') {
      return NextResponse.json(
        { error: 'Settings for this game can only be changed from the web' },
        { status: 403 },
      )
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json(
        { error: 'Cannot update settings after race has started' },
        { status: 400 },
      )
    }

    const updateData: Record<string, any> = {}

    if (game.gameStatus === 'ready') {
      updateData.gameStatus = 'waiting'
    }

    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic
    if (body.categoryMode !== undefined) updateData.categoryMode = body.categoryMode

    // Check if path-affecting settings changed
    const newCategory = body.category ?? game.category
    const newPathLength = body.pathLength ?? game.pathLength
    const newDiffMin = body.difficultyMin ?? game.difficultyRange?.min ?? 0
    const newDiffMax = body.difficultyMax ?? game.difficultyRange?.max ?? 5
    const newCategoryMode = body.categoryMode ?? game.categoryMode

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
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }
      }

      // Maps are generated at game start, not during settings changes
      updateData.maps = []
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
          score: 0,
          completedSteps: [],
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
        teams[0].teamName = `${user.ingameNick || user.username}'s Team`
      }

      updateData.teams = teams
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true })
    }

    // Reset ready status when settings change
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

    await payload.update({ collection: 'races', id: gameId, data: updateData })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error updating race settings (client):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 },
    )
  }
}
