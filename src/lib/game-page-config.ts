/**
 * Shared configuration for game page variants (DDNet Bingo, DDNet Race, KoG Bingo, KoG Race).
 * Used to parameterize shared page components instead of duplicating 1400+ line files.
 */

export interface BingoPageConfig {
  /** Payload collection slug */
  collection: 'bingo' | 'kog-bingo'
  /** API type for game creation */
  apiType: 'bingo' | 'kog-bingo'
  /** Base path for this game mode (e.g., '/app/bingo') */
  lobbyPath: string
  /** Default category when creating a game */
  defaultCategory: string
  /** Whether to use KoG categories in dropdowns */
  useKoGCategories: boolean
  /** Collection slug for Payload REST API queries */
  apiCollection: string
  /** API type for my-games endpoint */
  myGamesType: string
}

export interface RacePageConfig {
  /** Payload collection slug */
  collection: 'races' | 'kog-races'
  /** API type for game creation */
  apiType: 'race' | 'kog-race'
  /** Base path for this game mode */
  lobbyPath: string
  /** Default category when creating a game */
  defaultCategory: string
  /** Whether to use KoG categories in dropdowns */
  useKoGCategories: boolean
  /** Collection slug for Payload REST API queries */
  apiCollection: string
  /** API type for my-games endpoint */
  myGamesType: string
  /** Whether server IP is required to start */
  requireServerIp: boolean
}

export const DDNET_BINGO_CONFIG: BingoPageConfig = {
  collection: 'bingo',
  apiType: 'bingo',
  lobbyPath: '/app/bingo',
  defaultCategory: 'novice',
  useKoGCategories: false,
  apiCollection: 'bingo',
  myGamesType: 'bingo',
}

export const KOG_BINGO_CONFIG: BingoPageConfig = {
  collection: 'kog-bingo',
  apiType: 'kog-bingo',
  lobbyPath: '/app/kog-bingo',
  defaultCategory: 'kog_main',
  useKoGCategories: true,
  apiCollection: 'kog-bingo',
  myGamesType: 'kog-bingo',
}

export const DDNET_RACE_CONFIG: RacePageConfig = {
  collection: 'races',
  apiType: 'race',
  lobbyPath: '/app/race',
  defaultCategory: 'novice',
  useKoGCategories: false,
  apiCollection: 'races',
  myGamesType: 'race',
  requireServerIp: true,
}

export const KOG_RACE_CONFIG: RacePageConfig = {
  collection: 'kog-races',
  apiType: 'kog-race',
  lobbyPath: '/app/kog-race',
  defaultCategory: 'kog_main',
  useKoGCategories: true,
  apiCollection: 'kog-races',
  myGamesType: 'kog-race',
  requireServerIp: false,
}
