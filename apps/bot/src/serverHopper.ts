export interface ServerInfo {
  ip: string
  port: number
  name?: string
}

/**
 * Server hopping manager for bot verification
 */
export class ServerHopper {
  private servers: ServerInfo[]
  private currentIndex: number = 0

  constructor(servers: ServerInfo[]) {
    this.servers = servers
    // Shuffle servers to distribute load
    this.shuffleServers()
  }

  private shuffleServers(): void {
    for (let i = this.servers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.servers[i], this.servers[j]] = [this.servers[j], this.servers[i]]
    }
  }

  getNextServer(): ServerInfo | null {
    if (this.currentIndex >= this.servers.length) {
      return null
    }
    return this.servers[this.currentIndex++]
  }

  hasMoreServers(): boolean {
    return this.currentIndex < this.servers.length
  }

  getRemainingCount(): number {
    return this.servers.length - this.currentIndex
  }

  reset(): void {
    this.currentIndex = 0
    this.shuffleServers()
  }
}
