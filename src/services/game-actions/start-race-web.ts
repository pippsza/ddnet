import type { Race } from '@/payload-types'
import type { GameContext, ActionResult } from './types'
import { handleStartValidation } from './start'
import { getBotManager } from '@/services/verification/BotManager'
import { generateRacePath } from '@/services/race/pathGenerator'

export async function handleStartRaceWeb(ctx: GameContext): Promise<ActionResult> {
  const validation = await handleStartValidation(ctx)
  if ('error' in validation) return validation

  const { payload, gameId, game } = ctx
  const race = game as Race

  // Validate server is configured before starting
  if (!race.server?.ip) {
    return { error: 'Server IP is required to start the game', status: 400 }
  }

  // Generate maps at start time (not during settings)
  let maps = race.maps || []
  if (race.categoryMode !== 'free' && race.category) {
    maps = await generateRacePath({
      category: race.category,
      pathLength: race.pathLength,
      difficultyMin: race.difficultyRange?.min ?? 0,
      difficultyMax: race.difficultyRange?.max ?? 5,
    })
  }

  // Check if race bot is enabled
  const botSettings = await payload.findGlobal({ slug: 'bot-settings' })
  let containerId: string | undefined

  if (botSettings.raceBotEnabled) {
    const botManager = getBotManager()
    if (!botManager.hasAvailableSlots()) {
      return { error: 'No bot slots available. Try again later.', status: 503 }
    }

    // Collect all player ingame nicks
    const allPlayerIds = race.teams.flatMap((t) =>
      (t.players ?? []).map((p) => (typeof p.user === 'string' ? p.user : p.user.id)),
    )
    const playerUsers = await Promise.all(
      allPlayerIds.map((id) => payload.findByID({ collection: 'users', id })),
    )
    const playerNames = playerUsers.map((u) => u.ingameNick).filter(Boolean) as string[]

    containerId = await botManager.startRaceBot(
      gameId,
      race.server.ip,
      race.server.port ?? 8303,
      playerNames,
      maps,
    )
  }

  // Update game status
  for (const team of race.teams) {
    team.teamStatus = 'playing'
  }

  await payload.update({
    collection: 'races',
    id: gameId,
    data: {
      gameStatus: 'in_progress',
      startedAt: new Date().toISOString(),
      teams: race.teams,
      maps,
      ...(containerId ? { botContainerId: containerId } : {}),
    },
  })

  // Create bot record only if bot was started
  if (containerId) {
    await payload.create({
      collection: 'bots',
      data: {
        name: `RaceBot-${gameId.slice(0, 8)}`,
        containerId,
        mode: 'race',
        status: 'running',
        connectedServer: {
          ip: race.server!.ip!,
          port: race.server!.port ?? 8303,
          name: race.server!.name ?? '',
        },
        linkedGame: { relationTo: 'races', value: gameId },
        startedAt: new Date().toISOString(),
      },
    })
  }

  return {
    success: true,
    data: {
      success: true,
      message: 'Race started!',
      botDisabled: !botSettings.raceBotEnabled,
    },
  }
}
