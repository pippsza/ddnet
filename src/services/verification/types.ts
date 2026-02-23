import type { VerificationStatus } from '@/lib/verification-constants'

export interface VerificationStartResult {
  requestId: string
  status: VerificationStatus
}

export interface VerificationStatusResult {
  status: VerificationStatus
  currentServer?: string
  message?: string
}

export type BotCallbackResult = 'verified' | 'hidden' | 'not_found' | 'error'

export interface BotCallback {
  requestId: string
  nickname: string
  serverIp: string
  serverPort: number
  result: BotCallbackResult
  message?: string
}

export interface BotDriverInterface {
  startVerification(
    nickname: string,
    requestId: string,
    serverIp: string,
    serverPort: number,
    botLoginToken: string,
  ): Promise<string>
  stopVerification(containerId: string): Promise<void>
  startRaceBot?(raceId: string, serverIp: string, serverPort: number, players: string[]): Promise<string>
  stopBot?(containerId: string): Promise<void>
}

export interface ServerInfo {
  ip: string
  port: number
  name?: string
  region?: string
}
