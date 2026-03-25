import type { Payload } from 'payload'
import type { User, Bingo, Race, KogBingo, KogRace } from '@/payload-types'

export type GameCollection = 'bingo' | 'races' | 'kog-bingo' | 'kog-races'

export type GameDocument = Bingo | Race | KogBingo | KogRace

export interface ResolvedAuth {
  user: User
  payload: Payload
}

export interface GameContext extends ResolvedAuth {
  gameId: string
  collection: GameCollection
  game: GameDocument
}

export type ActionResult =
  | { success: true; data?: Record<string, any> }
  | { error: string; status: number }

export interface CreateOptions {
  createdVia: 'web' | 'client'
  invitedPlayerId?: string
  invitedTeammateId?: string
  server?: { ip?: string; port?: number; name?: string }
}

export interface SettingsOptions {
  callerSource: 'web' | 'client'
  title?: string
  serverIp?: string
  serverPort?: number
  serverName?: string
}
