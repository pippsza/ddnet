import type { BotDriverInterface, ServerInfo } from './types'
import { MockBotDriver } from './MockBotDriver'
import { MAX_CONCURRENT_BOTS } from '@/lib/verification-constants'

const MAX_BOTS = parseInt(process.env.MAX_BOTS || '10')

interface BotInfo {
  containerId: string
  mode: 'verification' | 'race' | 'chat' | 'monitor'
  startedAt: Date
  linkedGame?: string
  linkedUser?: string
}

/**
 * BotManager handles Docker container orchestration for verification bots
 * Uses MockBotDriver in development mode (USE_MOCK_BOT=true)
 * Uses dockerode for production Docker container management
 */
export class BotManager implements BotDriverInterface {
  private docker: unknown
  private activeContainers = new Set<string>()
  private activeBotInfo = new Map<string, BotInfo>()
  private mockDriver: MockBotDriver | null = null

  private dockerInitialized = false

  constructor() {
    if (process.env.USE_MOCK_BOT === 'true') {
      this.mockDriver = new MockBotDriver()
      console.log('[BotManager] Using MockBotDriver for development')
    }
  }

  private async initDocker(): Promise<void> {
    if (this.dockerInitialized || this.mockDriver) return

    try {
      const Docker = (await import('dockerode')).default
      this.docker = new Docker({ socketPath: '/var/run/docker.sock' })
      this.dockerInitialized = true
      console.log('[BotManager] Connected to Docker daemon')
    } catch (error) {
      console.warn('[BotManager] Docker not available, falling back to MockBotDriver')
      this.mockDriver = new MockBotDriver()
    }
  }

  async startVerification(
    nickname: string,
    token: string,
    requestId: string,
    servers?: ServerInfo[],
  ): Promise<string> {
    // Initialize Docker if not already done
    if (!this.mockDriver && !this.dockerInitialized) {
      await this.initDocker()
    }

    if (this.mockDriver) {
      return this.mockDriver.startVerification(nickname, token, requestId)
    }

    if (this.activeContainers.size >= MAX_CONCURRENT_BOTS) {
      throw new Error('Maximum concurrent verifications reached. Please try again later.')
    }

    if (!this.docker) {
      throw new Error('Docker not available')
    }

    const serversJson = JSON.stringify(servers || [])
    const docker = this.docker as import('dockerode')

    const container = await docker.createContainer({
      Image: 'bingo-bot:latest',
      Env: [
        `TARGET_NICK=${nickname}`,
        `VERIFY_TOKEN=${token}`,
        `REQUEST_ID=${requestId}`,
        `SERVERS_LIST=${serversJson}`,
        `BACKEND_URL=${process.env.NEXT_PUBLIC_SERVER_URL || 'http://host.docker.internal:3000'}`,
        `BACKEND_SECRET=${process.env.BACKEND_SECRET}`,
      ],
      HostConfig: {
        AutoRemove: true,
        NetworkMode: 'bridge',
        ExtraHosts: ['host.docker.internal:host-gateway'],
      },
    })

    await container.start()
    this.activeContainers.add(container.id)
    this.activeBotInfo.set(container.id, {
      containerId: container.id,
      mode: 'verification',
      startedAt: new Date(),
      linkedUser: nickname,
    })
    console.log(`[BotManager] Started container: ${container.id} for ${nickname}`)

    return container.id
  }

  async stopVerification(containerId: string): Promise<void> {
    return this.stopBot(containerId)
  }

  async startRaceBot(
    raceId: string,
    serverIp: string,
    serverPort: number,
    players: string[],
  ): Promise<string> {
    if (!this.mockDriver && !this.dockerInitialized) {
      await this.initDocker()
    }

    if (this.mockDriver) {
      return this.mockDriver.startRaceBot(raceId, serverIp, serverPort, players)
    }

    if (this.activeContainers.size >= MAX_CONCURRENT_BOTS) {
      throw new Error('Maximum concurrent bots reached. Please try again later.')
    }

    if (!this.docker) {
      throw new Error('Docker not available')
    }

    const docker = this.docker as import('dockerode')

    const container = await docker.createContainer({
      Image: 'bingo-bot:latest',
      Env: [
        'BOT_MODE=race',
        `RACE_ID=${raceId}`,
        `SERVER_IP=${serverIp}`,
        `SERVER_PORT=${serverPort}`,
        `PLAYERS_LIST=${JSON.stringify(players)}`,
        `BACKEND_URL=${process.env.NEXT_PUBLIC_SERVER_URL || 'http://host.docker.internal:3000'}`,
        `BACKEND_SECRET=${process.env.BACKEND_SECRET}`,
      ],
      HostConfig: {
        AutoRemove: true,
        NetworkMode: 'bridge',
        ExtraHosts: ['host.docker.internal:host-gateway'],
      },
    })

    await container.start()
    this.activeContainers.add(container.id)
    this.activeBotInfo.set(container.id, {
      containerId: container.id,
      mode: 'race',
      startedAt: new Date(),
      linkedGame: raceId,
    })
    console.log(`[BotManager] Started race bot: ${container.id} for race ${raceId}`)

    return container.id
  }

  async stopBot(containerId: string): Promise<void> {
    if (this.mockDriver) {
      return this.mockDriver.stopVerification(containerId)
    }

    try {
      const docker = this.docker as import('dockerode')
      const container = docker.getContainer(containerId)
      await container.stop({ t: 5 })
      console.log(`[BotManager] Stopped container: ${containerId}`)
    } catch (error) {
      console.log(`[BotManager] Container ${containerId} already stopped or not found`)
    } finally {
      this.activeContainers.delete(containerId)
      this.activeBotInfo.delete(containerId)
    }
  }

  getActiveCount(): number {
    if (this.mockDriver) {
      return this.mockDriver.getActiveCount()
    }
    return this.activeContainers.size
  }

  hasAvailableSlots(): boolean {
    return this.getActiveCount() < MAX_BOTS
  }

  getActiveBots(): BotInfo[] {
    return Array.from(this.activeBotInfo.values())
  }

  async getBotLogs(containerId: string, tail = 100): Promise<string[]> {
    if (this.mockDriver) {
      return ['[Mock] Bot logs not available in development mode']
    }

    if (!this.docker) return []

    try {
      const docker = this.docker as import('dockerode')
      const container = docker.getContainer(containerId)
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      })
      return logs.toString().split('\n').filter(Boolean)
    } catch {
      return []
    }
  }

  async getBotStats(containerId: string): Promise<{ cpu: unknown; memory: unknown } | null> {
    if (this.mockDriver) {
      return { cpu: 0, memory: 0 }
    }

    if (!this.docker) return null

    try {
      const docker = this.docker as import('dockerode')
      const container = docker.getContainer(containerId)
      const stats = await container.stats({ stream: false })
      return {
        cpu: stats.cpu_stats,
        memory: stats.memory_stats,
      }
    } catch {
      return null
    }
  }

  async cleanupStale(): Promise<number> {
    let cleaned = 0
    const maxAge = 30 * 60 * 1000 // 30 minutes

    for (const [id, info] of this.activeBotInfo) {
      const age = Date.now() - info.startedAt.getTime()
      if (age > maxAge) {
        await this.stopBot(id)
        cleaned++
      }
    }

    return cleaned
  }
}

// Singleton instance
let botManager: BotManager | null = null

export function getBotManager(): BotManager {
  if (!botManager) {
    botManager = new BotManager()
  }
  return botManager
}
