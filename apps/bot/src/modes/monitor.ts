import { BaseBotMode } from './base.js'
import type { PlayerInfo } from '../client.js'

interface PlayerActivity {
  player: PlayerInfo
  joinedAt: Date
  lastSeen: Date
}

/**
 * Monitor mode - watches a server and tracks player activity
 * Can report to a webhook or log player statistics
 */
export class MonitorMode extends BaseBotMode {
  readonly name = 'monitor'
  readonly description = 'Monitor server and track player activity'
  readonly requiredEnv = ['SERVER_IP', 'SERVER_PORT']

  private playerActivity: Map<string, PlayerActivity> = new Map()
  private webhookUrl: string | null = null
  private pollInterval = 5000

  init(config: Record<string, string>): void {
    super.init(config)

    if (config.WEBHOOK_URL) {
      this.webhookUrl = config.WEBHOOK_URL
    }

    if (config.POLL_INTERVAL) {
      this.pollInterval = parseInt(config.POLL_INTERVAL, 10)
    }
  }

  async run(): Promise<void> {
    const { SERVER_IP, SERVER_PORT } = this.config

    console.log(`[Monitor] Starting server monitor`)
    console.log(`[Monitor] Connecting to ${SERVER_IP}:${SERVER_PORT}`)

    const client = this.createClient('Monitor')

    await client.connect(SERVER_IP, parseInt(SERVER_PORT, 10))

    console.log(`[Monitor] Connected. Polling every ${this.pollInterval}ms`)

    // Keep running until interrupted
    let running = true
    process.on('SIGTERM', () => (running = false))
    process.on('SIGINT', () => (running = false))

    while (running) {
      await this.sleep(this.pollInterval)

      const currentPlayers = client.getPlayers()
      const currentNames = new Set(currentPlayers.map((p) => p.name))

      // Check for new players
      for (const player of currentPlayers) {
        if (!this.playerActivity.has(player.name)) {
          console.log(`[Monitor] Player joined: ${player.name}`)
          this.playerActivity.set(player.name, {
            player,
            joinedAt: new Date(),
            lastSeen: new Date(),
          })
          await this.notifyPlayerJoin(player)
        } else {
          // Update last seen
          const activity = this.playerActivity.get(player.name)!
          activity.lastSeen = new Date()
        }
      }

      // Check for players who left
      for (const [name, activity] of this.playerActivity) {
        if (!currentNames.has(name)) {
          const duration = Date.now() - activity.joinedAt.getTime()
          console.log(`[Monitor] Player left: ${name} (played for ${Math.round(duration / 1000)}s)`)
          await this.notifyPlayerLeave(activity)
          this.playerActivity.delete(name)
        }
      }
    }

    this.printStats()
  }

  private async notifyPlayerJoin(player: PlayerInfo): Promise<void> {
    if (!this.webhookUrl) return

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'player_join',
          player: player.name,
          clan: player.clan,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('[Monitor] Webhook error:', error)
    }
  }

  private async notifyPlayerLeave(activity: PlayerActivity): Promise<void> {
    if (!this.webhookUrl) return

    const duration = Date.now() - activity.joinedAt.getTime()

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'player_leave',
          player: activity.player.name,
          duration_seconds: Math.round(duration / 1000),
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('[Monitor] Webhook error:', error)
    }
  }

  private printStats(): void {
    console.log('\n[Monitor] Session Statistics:')
    console.log(`Total unique players tracked: ${this.playerActivity.size}`)
  }
}
