import { BaseBotMode } from './base.js'
import { BackendApi } from '../api.js'

const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_DELAY_MS = 3000

/**
 * Race mode - monitors server chat for finish messages and reports to backend.
 * The bot connects to the specified server, listens for DDNet finish patterns,
 * and automatically reconnects if disconnected (e.g. on map change).
 */
export class RaceMode extends BaseBotMode {
  readonly name = 'race'
  readonly description = 'Monitor server for race finishes'
  readonly requiredEnv = [
    'RACE_ID',
    'SERVER_IP',
    'SERVER_PORT',
    'PLAYERS_LIST',
    'BACKEND_URL',
    'BACKEND_SECRET',
  ]

  private api: BackendApi | null = null
  private racePlayers: string[] = []
  private currentMap = ''
  private stopping = false
  private reconnectAttempts = 0

  init(config: Record<string, string>): void {
    super.init(config)

    try {
      this.racePlayers = JSON.parse(config.PLAYERS_LIST || '[]')
    } catch {
      throw new Error('Failed to parse PLAYERS_LIST')
    }

    if (this.racePlayers.length === 0) {
      throw new Error('No players provided in PLAYERS_LIST')
    }

    this.api = new BackendApi(config.BACKEND_URL, config.BACKEND_SECRET)
  }

  async run(): Promise<void> {
    const { RACE_ID, SERVER_IP, SERVER_PORT } = this.config

    console.log(`[Race] Starting race monitor for game ${RACE_ID}`)
    console.log(`[Race] Server: ${SERVER_IP}:${SERVER_PORT}`)
    console.log(`[Race] Monitoring players: ${this.racePlayers.join(', ')}`)

    // Set up shutdown handlers
    const shutdownPromise = this.waitForStop()

    // Initial connection + reconnect loop
    this.connectWithReconnect().catch((err) => {
      console.error('[Race] Fatal connection error:', err)
    })

    // Wait for shutdown signal
    await shutdownPromise
  }

  private async connectWithReconnect(): Promise<void> {
    const { RACE_ID, SERVER_IP, SERVER_PORT } = this.config

    while (!this.stopping) {
      try {
        const client = this.createClient('RaceBot')

        // Set up auto-reconnect on disconnect
        client.onDisconnect((reason: string) => {
          if (this.stopping) return

          this.reconnectAttempts++
          console.log(
            `[Race] Connection lost: ${reason}. Reconnecting (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`,
          )

          if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            console.error(`[Race] Max reconnect attempts reached. Giving up.`)
            this.stopping = true
            return
          }

          // Schedule reconnect after delay
          setTimeout(() => {
            if (!this.stopping) {
              this.connectWithReconnect().catch((err) => {
                console.error('[Race] Reconnect loop failed:', err)
              })
            }
          }, RECONNECT_DELAY_MS)
        })

        await client.connect(SERVER_IP, parseInt(SERVER_PORT))
        this.reconnectAttempts = 0 // Reset on successful connection
        console.log(`[Race] Connected successfully. Monitoring for finishes...`)

        // Subscribe to chat messages for finish detection
        client.onMessage(async (msg) => {
          await this.handleMessage(msg)
        })

        // Monitor for map changes via broadcast messages
        const rawClient = client.getRawClient()
        if (rawClient) {
          rawClient.on('map_details', (...args: unknown[]) => {
            const details = args[0] as { name: string }
            if (details.name && details.name !== this.currentMap) {
              const oldMap = this.currentMap
              this.currentMap = details.name
              console.log(`[Race] Map changed: ${oldMap || '(none)'} -> ${this.currentMap}`)
              this.api!.reportMapChange(RACE_ID, this.currentMap).catch((err) =>
                console.error('[Race] Failed to report map change:', err),
              )
            }
          })
        }

        // Connection established — stop retrying
        break
      } catch (error) {
        if (this.stopping) return

        this.reconnectAttempts++
        console.error(`[Race] Connection attempt ${this.reconnectAttempts} failed:`, error)

        if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
          console.error(`[Race] Max reconnect attempts reached. Giving up.`)
          throw error
        }

        console.log(`[Race] Retrying in ${RECONNECT_DELAY_MS / 1000}s...`)
        await this.sleep(RECONNECT_DELAY_MS)
      }
    }
  }

  private async handleMessage(msg: { author: string; text: string; team: boolean }) {
    // DDNet server finish message format: "PlayerName finished in XX:XX.XX"
    const finishRegex = /^(.+?) finished in (\d+):(\d+)\.(\d+)/i
    const match = msg.text.match(finishRegex)

    if (!match) return

    const [, playerName, minutes, seconds, centiseconds] = match
    const finishTime =
      parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100

    // Check if this player is a race participant
    const trimmedName = playerName.trim()
    const isRacePlayer = this.racePlayers.some(
      (p) => p.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (!isRacePlayer) {
      return
    }

    console.log(`[Race] Finish detected: ${trimmedName} in ${finishTime.toFixed(2)}s`)

    try {
      await this.api!.reportRaceFinish(this.config.RACE_ID, trimmedName, finishTime)
      console.log(`[Race] Finish reported for ${trimmedName}`)
    } catch (error) {
      console.error(`[Race] Failed to report finish for ${trimmedName}:`, error)
    }
  }

  private waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      const shutdown = () => {
        console.log('[Race] Shutting down...')
        this.stopping = true
        resolve()
      }
      process.on('SIGTERM', shutdown)
      process.on('SIGINT', shutdown)
    })
  }
}
