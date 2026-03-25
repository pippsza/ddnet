import type { GameContext, ActionResult } from './types'
import { handleStartValidation } from './start'
import { generateKoGRacePath } from '@/services/kog/pathGenerator'
import type { KogRace } from '@/payload-types'

export async function handleStartKoGRaceWeb(ctx: GameContext): Promise<ActionResult> {
  const validation = await handleStartValidation(ctx)
  if ('error' in validation) return validation

  const { payload, gameId, collection, game } = ctx
  const race = game as KogRace

  // Generate maps for the race path
  const maps = await generateKoGRacePath({
    category: race.category,
    pathLength: race.pathLength,
    difficultyMin: race.difficultyRange?.min ?? 0,
    difficultyMax: race.difficultyRange?.max ?? 5,
  })

  for (const team of game.teams) {
    team.teamStatus = 'playing'
  }

  await payload.update({
    collection,
    id: gameId,
    data: {
      gameStatus: 'in_progress',
      startedAt: new Date().toISOString(),
      teams: game.teams,
      maps,
      currentStep: 0,
      currentMap: maps[0]?.mapName || null,
    },
  })

  return {
    success: true,
    data: {
      success: true,
      message: 'KoG Race started!',
      startedAt: new Date().toISOString(),
    },
  }
}
