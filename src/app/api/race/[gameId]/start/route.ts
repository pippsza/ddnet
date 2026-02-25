import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBotManager } from '@/services/verification/BotManager'
import { generateRacePath } from '@/services/race/pathGenerator'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 2 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can start the race' }, { status: 403 })
    }

    if (game.gameStatus !== 'ready' && game.gameStatus !== 'waiting') {
      return NextResponse.json({ error: 'Race cannot be started in its current state' }, { status: 400 })
    }

    // Validate all teams have players
    for (const team of game.teams) {
      if (!team.players || team.players.length === 0) {
        return NextResponse.json({ error: `${team.teamName} has no players` }, { status: 400 })
      }
    }

    // Validate all non-creator players are ready
    for (const team of game.teams) {
      for (const p of team.players ?? []) {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        if (pid !== user.id && !p.isReady) {
          return NextResponse.json({ error: 'Not all players are ready' }, { status: 400 })
        }
      }
    }

    // Validate server is configured before starting
    if (!game.server?.ip) {
      return NextResponse.json({ error: 'Server IP is required to start the game' }, { status: 400 })
    }

    // Check bot availability
    const botManager = getBotManager()
    if (!botManager.hasAvailableSlots()) {
      return NextResponse.json({ error: 'No bot slots available. Try again later.' }, { status: 503 })
    }

    // Generate maps at start time (not during settings)
    let maps = game.maps || []
    if (game.categoryMode !== 'free' && game.category) {
      maps = await generateRacePath({
        category: game.category,
        pathLength: game.pathLength,
        difficultyMin: game.difficultyRange?.min ?? 0,
        difficultyMax: game.difficultyRange?.max ?? 5,
      })
    }

    // Collect all player ingame nicks
    const allPlayerIds = game.teams.flatMap((t) =>
      (t.players ?? []).map((p) => (typeof p.user === 'string' ? p.user : p.user.id)),
    )
    const playerUsers = await Promise.all(
      allPlayerIds.map((id) => payload.findByID({ collection: 'users', id })),
    )
    const playerNames = playerUsers.map((u) => u.ingameNick).filter(Boolean) as string[]

    // Start the race bot
    const containerId = await botManager.startRaceBot(
      gameId,
      game.server.ip,
      game.server.port ?? 8303,
      playerNames,
      maps,
    )

    // Update game status
    for (const team of game.teams) {
      team.teamStatus = 'playing'
    }

    await payload.update({
      collection: 'races',
      id: gameId,
      data: {
        gameStatus: 'in_progress',
        startedAt: new Date().toISOString(),
        teams: game.teams,
        maps,
        botContainerId: containerId,
      },
    })

    // Create bot record
    await payload.create({
      collection: 'bots',
      data: {
        name: `RaceBot-${gameId.slice(0, 8)}`,
        containerId,
        mode: 'race',
        status: 'running',
        connectedServer: {
          ip: game.server!.ip!,
          port: game.server!.port ?? 8303,
          name: game.server!.name ?? '',
        },
        linkedGame: { relationTo: 'races', value: gameId },
        startedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, message: 'Race started!' })
  } catch (error: any) {
    console.error('[API] Error starting race:', error)
    return NextResponse.json({ error: error.message || 'Failed to start race' }, { status: 500 })
  }
}
