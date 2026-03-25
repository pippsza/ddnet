import type { Payload } from 'payload'
import type { User, Bingo, Race, KogBingo, KogRace } from '@/payload-types'
import type { GameContext, ActionResult, GameCollection, GameDocument } from './types'
import { resolveUserId } from './helpers'
import { generateBingoGrid } from '@/services/bingo/gridGenerator'
import { generateRacePath } from '@/services/race/pathGenerator'
import { generateKoGBingoGrid } from '@/services/kog/gridGenerator'
import { generateKoGRacePath } from '@/services/kog/pathGenerator'

async function tryJoinExistingRematch(
  payload: Payload,
  user: User,
  collection: GameCollection,
  existingRematchId: string,
): Promise<ActionResult | null> {
  let rematchGame: GameDocument
  try {
    rematchGame = await payload.findByID({ collection, id: existingRematchId, depth: 1 }) as GameDocument
  } catch {
    return null
  }

  if (!rematchGame || (rematchGame.gameStatus !== 'waiting' && rematchGame.gameStatus !== 'ready')) {
    return null
  }

  // Check if user is already in the rematch game
  const alreadyIn = rematchGame.teams.some((team) =>
    team.players?.some((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid === user.id
    }),
  )

  if (alreadyIn) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: { relationTo: collection, value: existingRematchId } },
    })
    return { success: true, data: { success: true, gameId: existingRematchId } }
  }

  // Find a team with space and join
  let targetTeamIndex = -1
  if (rematchGame.mode === 'solo') {
    if ((rematchGame.teams[0].players ?? []).length < 2) targetTeamIndex = 0
  } else {
    // Prefer empty teams first
    for (let i = 0; i < rematchGame.teams.length; i++) {
      if ((rematchGame.teams[i].players ?? []).length === 0) {
        targetTeamIndex = i
        break
      }
    }
    if (targetTeamIndex < 0) {
      for (let i = 0; i < rematchGame.teams.length; i++) {
        if ((rematchGame.teams[i].players ?? []).length < 2) {
          targetTeamIndex = i
          break
        }
      }
    }
  }

  if (targetTeamIndex >= 0) {
    const updatedTeams = rematchGame.teams.map((team, idx) => {
      if (idx !== targetTeamIndex) return team
      return {
        ...team,
        players: [...(team.players ?? []), { user: user.id, isReady: false }],
        pendingInvites: (team.pendingInvites ?? []).filter((p) => {
          const pid = typeof p.user === 'string' ? p.user : p.user.id
          return pid !== user.id
        }),
      }
    })

    await payload.update({ collection, id: existingRematchId, data: { teams: updatedTeams } })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: { relationTo: collection, value: existingRematchId } },
    })

    return { success: true, data: { success: true, gameId: existingRematchId } }
  }

  // Rematch game is full or gone — fall through
  return null
}

export async function handleRematch(ctx: GameContext): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  if (game.gameStatus !== 'completed' && game.gameStatus !== 'cancelled') {
    return { error: 'Can only rematch a finished game', status: 400 }
  }

  // Check user was in the game
  const wasInGame = game.teams.some((team) =>
    team.players?.some((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid === user.id
    }),
  )
  if (!wasInGame) {
    return { error: 'You were not in this game', status: 403 }
  }

  // Block if user already has an active game (unless stale ref to this finished game)
  const freshUser = await payload.findByID({ collection: 'users', id: user.id })
  if (freshUser.activeGame) {
    const ref = freshUser.activeGame as { relationTo: string; value: string | { id: string } }
    const refId = typeof ref.value === 'object' ? ref.value.id : ref.value
    if (refId !== gameId) {
      return { error: 'You already have an active game. Finish or leave it first.', status: 400 }
    }
    await payload.update({ collection: 'users', id: user.id, data: { activeGame: null } })
  }

  // Check if a rematch game already exists
  const existingRematchId =
    typeof game.rematchGame === 'string' ? game.rematchGame : (game.rematchGame as any)?.id

  if (existingRematchId) {
    const joinResult = await tryJoinExistingRematch(payload, user, collection, existingRematchId)
    if (joinResult) return joinResult
  }

  // Create new game with same settings — type-specific
  let newGame: GameDocument
  const COLLECTION_ROUTES: Record<GameCollection, string> = {
    bingo: 'bingo',
    races: 'race',
    'kog-bingo': 'kog-bingo',
    'kog-races': 'kog-race',
  }
  const gameType = collection
  const pageRoute = COLLECTION_ROUTES[collection]

  if (collection === 'bingo') {
    const bingoGame = game as Bingo
    const maps = await generateBingoGrid({
      category: bingoGame.category,
      gridSize: bingoGame.gridSize,
      difficultyMin: bingoGame.difficultyRange?.min ?? 0,
      difficultyMax: bingoGame.difficultyRange?.max ?? 5,
    })

    const teams: Bingo['teams'] = [
      {
        teamName: bingoGame.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: bingoGame.teams[0]?.color || 'red',
        players: [{ user: user.id, isReady: true }],
        completedCells: [],
        teamStatus: 'not_ready',
      },
    ]
    if (bingoGame.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: bingoGame.teams[1]?.color || 'blue',
        players: [],
        completedCells: [],
        teamStatus: 'not_ready',
      })
    }

    newGame = await payload.create({
      collection: 'bingo',
      data: {
        title: bingoGame.title,
        mode: bingoGame.mode,
        category: bingoGame.category,
        gridSize: bingoGame.gridSize,
        winCondition: bingoGame.winCondition,
        isPublic: false,
        difficultyRange: bingoGame.difficultyRange,
        createdBy: user.id,
        createdVia: bingoGame.createdVia ?? 'web',
        maps,
        teams,
        gameStatus: 'waiting',
      },
    })
  } else if (collection === 'races') {
    const raceGame = game as Race
    let maps: Race['maps'] = []
    if (raceGame.categoryMode !== 'free') {
      maps = await generateRacePath({
        category: raceGame.category,
        pathLength: raceGame.pathLength,
        difficultyMin: raceGame.difficultyRange?.min ?? 0,
        difficultyMax: raceGame.difficultyRange?.max ?? 5,
      })
    }

    const teams: Race['teams'] = [
      {
        teamName: raceGame.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: raceGame.teams[0]?.color || 'red',
        players: [{ user: user.id, isReady: true }],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      },
    ]
    if (raceGame.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: raceGame.teams[1]?.color || 'blue',
        players: [],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      })
    }

    newGame = await payload.create({
      collection: 'races',
      data: {
        title: raceGame.title,
        mode: raceGame.mode,
        categoryMode: raceGame.categoryMode,
        category: raceGame.category,
        pathLength: raceGame.pathLength,
        isPublic: false,
        difficultyRange: raceGame.difficultyRange,
        server: raceGame.server,
        createdBy: user.id,
        createdVia: raceGame.createdVia ?? 'web',
        maps,
        teams,
        gameStatus: 'waiting',
        currentStep: 0,
      } as Race,
    })
  } else if (collection === 'kog-bingo') {
    const kogGame = game as KogBingo
    const maps = await generateKoGBingoGrid({
      category: kogGame.category,
      gridSize: kogGame.gridSize,
      difficultyMin: kogGame.difficultyRange?.min ?? 0,
      difficultyMax: kogGame.difficultyRange?.max ?? 5,
    })

    const teams: KogBingo['teams'] = [
      {
        teamName: kogGame.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: kogGame.teams[0]?.color || 'red',
        players: [{ user: user.id, isReady: true }],
        completedCells: [],
        teamStatus: 'not_ready',
      },
    ]
    if (kogGame.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: kogGame.teams[1]?.color || 'blue',
        players: [],
        completedCells: [],
        teamStatus: 'not_ready',
      })
    }

    newGame = await payload.create({
      collection: 'kog-bingo',
      data: {
        title: kogGame.title,
        mode: kogGame.mode,
        category: kogGame.category,
        gridSize: kogGame.gridSize,
        winCondition: kogGame.winCondition,
        isPublic: false,
        difficultyRange: kogGame.difficultyRange,
        createdBy: user.id,
        createdVia: kogGame.createdVia ?? 'web',
        maps,
        teams,
        gameStatus: 'waiting',
      },
    })
  } else {
    // kog-races
    const kogRace = game as KogRace
    const maps = await generateKoGRacePath({
      category: kogRace.category,
      pathLength: kogRace.pathLength,
      difficultyMin: kogRace.difficultyRange?.min ?? 0,
      difficultyMax: kogRace.difficultyRange?.max ?? 5,
    })

    const teams: KogRace['teams'] = [
      {
        teamName: kogRace.mode === 'solo' ? `${user.ingameNick || user.username}'s Team` : 'Team 1',
        color: kogRace.teams[0]?.color || 'red',
        players: [{ user: user.id, isReady: true }],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      },
    ]
    if (kogRace.mode === 'team') {
      teams.push({
        teamName: 'Team 2',
        color: kogRace.teams[1]?.color || 'blue',
        players: [],
        score: 0,
        completedSteps: [],
        teamStatus: 'not_ready',
      })
    }

    newGame = await payload.create({
      collection: 'kog-races',
      data: {
        title: kogRace.title,
        mode: kogRace.mode,
        category: kogRace.category,
        pathLength: kogRace.pathLength,
        isPublic: false,
        difficultyRange: kogRace.difficultyRange,
        createdBy: user.id,
        createdVia: kogRace.createdVia ?? 'web',
        maps,
        teams,
        gameStatus: 'waiting',
        currentStep: 0,
      },
    })
  }

  // Link rematch game on the original
  await payload.update({ collection, id: gameId, data: { rematchGame: newGame.id } })

  // Set active game for creator
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { activeGame: { relationTo: collection, value: newGame.id } },
  })

  // Invite all other players from the original game
  const otherPlayerIds = game.teams.flatMap((team) =>
    (team.players ?? [])
      .map((p) => (typeof p.user === 'string' ? p.user : p.user.id))
      .filter((pid) => pid !== user.id),
  )

  for (const playerId of otherPlayerIds) {
    try {
      await payload.create({
        collection: 'notifications',
        data: {
          recipient: playerId,
          type: 'game_invite',
          title: 'Rematch!',
          message: `${user.ingameNick || user.username} wants a rematch in ${game.title}`,
          actionUrl: `/app/${pageRoute}/${newGame.id}`,
          relatedGame: { relationTo: collection, value: newGame.id },
          relatedUser: user.id,
          metadata: {
            gameType,
            inviteCode: newGame.inviteCode,
          },
        },
      })
    } catch {
      // ignore notification errors
    }
  }

  return { success: true, data: { success: true, gameId: newGame.id } }
}
