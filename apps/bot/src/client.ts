import { Client } from 'teeworlds'

export interface PlayerInfo {
  clientId: number
  name: string
  clan: string
  skin: string
  country: number
}

export interface ClientOptions {
  name: string
  clan?: string
  skin?: string
  timeout?: number
}

interface RawMessage {
  team: number
  client_id: number
  message: string
  author?: {
    ClientInfo?: { name: string; clan: string; skin: string; country: number }
    PlayerInfo?: { client_id: number; team: number; score: number }
  }
}

/**
 * Teeworlds client wrapper for bot functionality
 * Uses the teeworlds npm package (v2.5.x)
 */
export class TeeworldsClient {
  private client: Client | null = null
  private connected = false
  private players: Map<number, PlayerInfo> = new Map()
  private options: ClientOptions
  private serverIp = ''
  private serverPort = 0
  private onDisconnectHandler: ((reason: string) => void) | null = null

  constructor(options: ClientOptions) {
    this.options = options
  }

  async connect(ip: string, port: number): Promise<void> {
    this.serverIp = ip
    this.serverPort = port

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.disconnect()
        reject(new Error('Connection timeout'))
      }, this.options.timeout || 10000)

      this.client = new Client(ip, port, this.options.name, {
        identity: {
          name: this.options.name,
          clan: this.options.clan || 'DDNet',
          skin: this.options.skin || 'default',
        },
      })

      this.client.on('connected', () => {
        clearTimeout(timeout)
        this.connected = true
        console.log(`[Client] Connected to ${ip}:${port}`)
        resolve()
      })

      this.client.on('disconnect', (reason: string) => {
        this.connected = false
        this.players.clear()
        console.log(`[Client] Disconnected: ${reason}`)
        if (this.onDisconnectHandler) {
          this.onDisconnectHandler(reason)
        }
      })

      // Update player list from snapshots
      this.client.on('snapshot', () => {
        this.updatePlayersFromSnapshot()
      })

      this.client.connect()
    })
  }

  /**
   * Reconnect to the same server
   */
  async reconnect(): Promise<void> {
    if (!this.serverIp || !this.serverPort) {
      throw new Error('No previous connection to reconnect to')
    }

    // Clean up old client
    if (this.client) {
      try {
        this.client.Disconnect()
      } catch {
        // Ignore errors on old client
      }
      this.client = null
    }

    this.connected = false
    this.players.clear()

    console.log(`[Client] Reconnecting to ${this.serverIp}:${this.serverPort}...`)
    return this.connect(this.serverIp, this.serverPort)
  }

  /**
   * Set a handler for disconnect events (used for auto-reconnect)
   */
  onDisconnect(handler: (reason: string) => void): void {
    this.onDisconnectHandler = handler
  }

  private updatePlayersFromSnapshot(): void {
    if (!this.client) return

    try {
      const clientInfos = this.client.SnapshotUnpacker.AllObjClientInfo
      this.players.clear()

      for (const info of clientInfos) {
        this.players.set(info.clientId, {
          clientId: info.clientId,
          name: info.name,
          clan: info.clan,
          skin: info.skin,
          country: info.country,
        })
      }
    } catch {
      // Snapshot may not be ready yet
    }
  }

  disconnect(): void {
    this.onDisconnectHandler = null // Prevent reconnect on intentional disconnect
    if (this.client && this.connected) {
      this.flush() // flush any queued messages before sending disconnect
      this.client.Disconnect()
      this.connected = false
      this.players.clear()
    }
  }

  /**
   * Gracefully disconnect — flushes queued messages, sends disconnect, and
   * waits for packets to be flushed before returning.
   */
  async gracefulDisconnect(waitMs = 500): Promise<void> {
    this.flush() // ensure any queued messages are sent
    await this.sleep(waitMs) // wait for server to process the message
    this.disconnect()        // flush again + send disconnect packet
    await this.sleep(300)    // wait for disconnect packet to flush before process exits
  }

  /**
   * Wait for player list to populate and check if player is online
   */
  async findPlayer(nickname: string, waitMs = 3000): Promise<PlayerInfo | null> {
    await this.sleep(waitMs)

    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === nickname.toLowerCase()) {
        return player
      }
    }

    return null
  }

  /**
   * Send a chat message
   */
  say(message: string): void {
    if (!this.client || !this.connected) {
      throw new Error('Not connected')
    }
    this.client.game.Say(message)
  }

  /**
   * Flush all queued messages immediately.
   * The teeworlds library queues messages via QueueChunkEx() and only
   * auto-flushes every ~500ms. Call this after say()/whisper() to ensure
   * the message is actually sent over the wire before disconnecting.
   */
  flush(): void {
    if (!this.client) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this.client as any).Flush()
  }

  /**
   * Send a whisper to a player by name.
   * DDNet /whisper accepts both client_id and player name.
   */
  whisper(nickname: string, message: string): void {
    const player = this.getPlayerByName(nickname)
    if (player) {
      this.say(`/whisper ${player.clientId} ${message}`)
      console.log(`[Client] Whispered to ${nickname} (cid: ${player.clientId})`)
    } else {
      // Fallback: DDNet accepts player name directly
      this.say(`/whisper ${nickname} ${message}`)
      console.log(`[Client] Whispered to ${nickname} (by name, no snapshot data)`)
    }
  }

  /**
   * Send team chat message
   */
  teamSay(message: string): void {
    if (!this.client || !this.connected) {
      throw new Error('Not connected')
    }
    this.client.game.SayTeam(message)
  }

  /**
   * Get all online players
   */
  getPlayers(): PlayerInfo[] {
    return Array.from(this.players.values())
  }

  /**
   * Get player by name
   */
  getPlayerByName(name: string): PlayerInfo | undefined {
    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === name.toLowerCase()) {
        return player
      }
    }
    return undefined
  }

  isConnected(): boolean {
    return this.connected
  }

  /**
   * Subscribe to chat messages (from players only, client_id >= 0)
   */
  onMessage(handler: (message: { author: string; text: string; team: boolean }) => void): void {
    if (!this.client) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this.client as any).on('message', (msg: RawMessage) => {
      // Skip server messages (client_id === -1, no author)
      if (msg.client_id === -1 || !msg.author?.ClientInfo) return

      handler({
        author: msg.author.ClientInfo.name,
        text: msg.message,
        team: !!msg.team,
      })
    })
  }

  /**
   * Subscribe to server/system messages (client_id === -1)
   */
  onServerMessage(handler: (text: string) => void): void {
    if (!this.client) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this.client as any).on('message', (msg: RawMessage) => {
      if (msg.client_id === -1) {
        handler(msg.message)
      }
    })
  }

  /**
   * Wait for a server message matching a regex pattern.
   * Returns the full message text or null on timeout.
   */
  waitForServerMessage(pattern: RegExp, timeoutMs: number): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.client) {
        resolve(null)
        return
      }

      const emitter = this.client as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const listener = (msg: RawMessage) => {
        if (msg.client_id !== -1) return

        if (pattern.test(msg.message)) {
          clearTimeout(timeout)
          emitter.off('message', listener)
          resolve(msg.message)
        }
      }

      const timeout = setTimeout(() => {
        emitter.off('message', listener)
        resolve(null)
      }, timeoutMs)

      emitter.on('message', listener)
    })
  }

  /**
   * Get raw client for advanced usage
   */
  getRawClient(): Client | null {
    return this.client
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
