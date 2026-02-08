import type { VerificationStatus } from '@/lib/verification-constants'

export interface VerificationStartResult {
  requestId: string
  token: string
  status: VerificationStatus
}

export interface VerificationStatusResult {
  status: VerificationStatus
  currentServer?: string
  message?: string
}

export interface BotCallback {
  requestId: string
  nickname: string
  serverIp: string
  serverPort: number
  found: boolean
}

export interface BotDriverInterface {
  startVerification(nickname: string, token: string, requestId: string): Promise<string>
  stopVerification(containerId: string): Promise<void>
  startRaceBot?(raceId: string, serverIp: string, serverPort: number, players: string[]): Promise<string>
  stopBot?(containerId: string): Promise<void>
}

export interface ServerInfo {
  ip: string
  port: number
  name?: string
}
