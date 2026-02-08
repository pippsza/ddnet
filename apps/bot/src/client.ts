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
      this.client.Disconnect()
      this.connected = false
      this.players.clear()
    }
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
   * Send a whisper to a player
   */
  whisper(nickname: string, message: string): void {
    this.say(`/w "${nickname}" ${message}`)
    console.log(`[Client] Whispered to ${nickname}`)
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
   * Subscribe to chat messages
   */
  onMessage(handler: (message: { author: string; text: string; team: boolean }) => void): void {
    if (!this.client) return

    this.client.on('message', (msg: { message: string; author: { name: string }; team: boolean }) => {
      handler({
        author: msg.author.name,
        text: msg.message,
        team: msg.team,
      })
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
