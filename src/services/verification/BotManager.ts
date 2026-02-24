import type { BotDriverInterface } from './types'
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
    requestId: string,
    serverIp: string,
    serverPort: number,
    botLoginToken: string,
  ): Promise<string> {
    if (!this.mockDriver && !this.dockerInitialized) {
      await this.initDocker()
    }

    if (this.mockDriver) {
      return this.mockDriver.startVerification(nickname, requestId, serverIp, serverPort, botLoginToken)
    }

    if (this.activeContainers.size >= MAX_CONCURRENT_BOTS) {
      throw new Error('Maximum concurrent verifications reached. Please try again later.')
    }

    if (!this.docker) {
      throw new Error('Docker not available')
    }

    const docker = this.docker as import('dockerode')

    const container = await docker.createContainer({
      Image: process.env.BOT_DOCKER_IMAGE || 'bingo-bot:latest',
      Env: [
        `TARGET_NICK=${nickname}`,
        `REQUEST_ID=${requestId}`,
        `SERVER_IP=${serverIp}`,
        `SERVER_PORT=${serverPort}`,
        `BOT_LOGIN_TOKEN=${botLoginToken}`,
        `BACKEND_URL=${(process.env.NEXT_PUBLIC_SERVER_URL || 'http://host.docker.internal:3000').replace('localhost', '127.0.0.1')}`,
        `BACKEND_SECRET=${process.env.BACKEND_SECRET}`,
      ],
      HostConfig: {
        AutoRemove: false,
        NetworkMode: 'host',
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
      Image: process.env.BOT_DOCKER_IMAGE || 'bingo-bot:latest',
      Env: [
        'BOT_MODE=race',
        `RACE_ID=${raceId}`,
        `SERVER_IP=${serverIp}`,
        `SERVER_PORT=${serverPort}`,
        `PLAYERS_LIST=${JSON.stringify(players)}`,
        `BACKEND_URL=${(process.env.NEXT_PUBLIC_SERVER_URL || 'http://host.docker.internal:3000').replace('localhost', '127.0.0.1')}`,
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

  async startTestBot(
    sessionId: string,
    serverIp: string,
    serverPort: number,
    botName: string,
    serverPassword?: string,
  ): Promise<string> {
    if (!this.mockDriver && !this.dockerInitialized) {
      await this.initDocker()
    }

    if (this.mockDriver) {
      console.log(`[BotManager] Mock test bot for session ${sessionId}`)
      return `mock-test-${sessionId}`
    }

    if (!this.docker) {
      throw new Error('Docker not available')
    }

    const docker = this.docker as import('dockerode')

    console.log(`[BotManager] Creating test container: image=${process.env.BOT_DOCKER_IMAGE || 'bingo-bot:latest'}, server=${serverIp}:${serverPort}`)

    const env = [
      'BOT_MODE=test',
      `SESSION_ID=${sessionId}`,
      `SERVER_IP=${serverIp}`,
      `SERVER_PORT=${serverPort}`,
      `BOT_NAME=${botName}`,
      `BACKEND_URL=${(process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3000').replace('localhost', '127.0.0.1')}`,
      `BACKEND_SECRET=${process.env.BACKEND_SECRET}`,
    ]
    if (serverPassword) env.push(`SERVER_PASSWORD=${serverPassword}`)

    const container = await docker.createContainer({
      Image: process.env.BOT_DOCKER_IMAGE || 'bingo-bot:latest',
      Tty: true,
      OpenStdin: false,
      Env: env,
      HostConfig: {
        AutoRemove: false,
        NetworkMode: 'host',
      },
    })

    await container.start()
    this.activeContainers.add(container.id)
    this.activeBotInfo.set(container.id, {
      containerId: container.id,
      mode: 'chat',
      startedAt: new Date(),
    })
    console.log(`[BotManager] Started test bot: ${container.id} for session ${sessionId}`)

    return container.id
  }

  async startIngameChatBot(
    sessionId: string,
    serverIp: string,
    serverPort: number,
    botName: string,
    targetNick: string,
    serverPassword?: string,
  ): Promise<string> {
    if (!this.mockDriver && !this.dockerInitialized) {
      await this.initDocker()
    }

    if (this.mockDriver) {
      console.log(`[BotManager] Mock ingame-chat bot for session ${sessionId}`)
      return `mock-ingamechat-${sessionId}`
    }

    if (!this.docker) {
      throw new Error('Docker not available')
    }

    const docker = this.docker as import('dockerode')

    console.log(
      `[BotManager] Creating ingame-chat container: server=${serverIp}:${serverPort}, target=${targetNick}`,
    )

    const env = [
      'BOT_MODE=ingamechat',
      `SESSION_ID=${sessionId}`,
      `SERVER_IP=${serverIp}`,
      `SERVER_PORT=${serverPort}`,
      `BOT_NAME=${botName}`,
      `TARGET_NICK=${targetNick}`,
      `BACKEND_URL=${(process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3000').replace('localhost', '127.0.0.1')}`,
      `BACKEND_SECRET=${process.env.BACKEND_SECRET}`,
    ]
    if (serverPassword) env.push(`SERVER_PASSWORD=${serverPassword}`)

    const container = await docker.createContainer({
      Image: process.env.BOT_DOCKER_IMAGE || 'bingo-bot:latest',
      Tty: true,
      OpenStdin: false,
      Env: env,
      HostConfig: {
        AutoRemove: false,
        NetworkMode: 'host',
      },
    })

    await container.start()
    this.activeContainers.add(container.id)
    this.activeBotInfo.set(container.id, {
      containerId: container.id,
      mode: 'chat',
      startedAt: new Date(),
      linkedUser: targetNick,
    })
    console.log(`[BotManager] Started ingame-chat bot: ${container.id} for session ${sessionId}`)

    return container.id
  }

  async stopBot(containerId: string): Promise<void> {
    if (this.mockDriver) {
      return this.mockDriver.stopVerification(containerId)
    }

    if (!this.docker) {
      await this.initDocker()
    }
    if (!this.docker) {
      console.error(`[BotManager] Cannot stop ${containerId}: Docker not available`)
      return
    }

    try {
      const docker = this.docker as import('dockerode')
      const container = docker.getContainer(containerId)
      await container.stop({ t: 5 })
      console.log(`[BotManager] Stopped container: ${containerId}`)
    } catch {
      console.log(`[BotManager] Container ${containerId} already stopped or not found`)
    }

    // Also try to remove the container (it was created with AutoRemove: false)
    try {
      const docker = this.docker as import('dockerode')
      const container = docker.getContainer(containerId)
      await container.remove({ force: true })
      console.log(`[BotManager] Removed container: ${containerId}`)
    } catch {
      // Already removed or doesn't exist
    }

    this.activeContainers.delete(containerId)
    this.activeBotInfo.delete(containerId)
  }

  /**
   * Stop a container directly by ID — used for orphaned containers
   * when the session has been lost (e.g., due to HMR).
   */
  async forceStopContainer(containerId: string): Promise<void> {
    if (this.mockDriver) return

    if (!this.docker) {
      await this.initDocker()
    }
    if (!this.docker) return

    try {
      const docker = this.docker as import('dockerode')
      const container = docker.getContainer(containerId)
      await container.stop({ t: 3 })
    } catch {
      // already stopped
    }
    try {
      const docker = this.docker as import('dockerode')
      const container = docker.getContainer(containerId)
      await container.remove({ force: true })
    } catch {
      // already removed
    }
    this.activeContainers.delete(containerId)
    this.activeBotInfo.delete(containerId)
    console.log(`[BotManager] Force-stopped container: ${containerId}`)
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
      const info = await container.inspect()
      const isTty = info.Config?.Tty === true

      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      })

      const buf = Buffer.isBuffer(logs) ? logs : Buffer.from(logs as string)

      if (isTty) {
        // TTY mode: plain text, no multiplexed headers
        return buf.toString('utf8').split('\n').filter(Boolean)
      }

      // Non-TTY: demux the 8-byte framed Docker stream format
      const lines: string[] = []
      let offset = 0
      while (offset + 8 <= buf.length) {
        const size = buf.readUInt32BE(offset + 4)
        offset += 8
        if (offset + size > buf.length) break
        const chunk = buf.subarray(offset, offset + size).toString('utf8')
        lines.push(...chunk.split('\n').filter(Boolean))
        offset += size
      }
      return lines
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

// Singleton instance — use globalThis to survive Next.js HMR in development
const globalBotManager = globalThis as typeof globalThis & {
  __botManager?: BotManager
}

export function getBotManager(): BotManager {
  if (!globalBotManager.__botManager || !(globalBotManager.__botManager instanceof BotManager)) {
    globalBotManager.__botManager = new BotManager()
  }
  return globalBotManager.__botManager
}
