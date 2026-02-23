import type { BotDriverInterface } from './types'

/**
 * Mock bot driver for local development
 * Simulates bot behavior without actual Docker containers
 */
export class MockBotDriver implements BotDriverInterface {
  private activeContainers = new Map<string, NodeJS.Timeout>()

  async startVerification(
    nickname: string,
    requestId: string,
    serverIp: string,
    serverPort: number,
    _botLoginToken: string,
  ): Promise<string> {
    const containerId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Simulate bot checking player after 3-5 seconds
    const delay = 3000 + Math.random() * 2000

    const timeout = setTimeout(async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        // Randomly simulate verified or hidden
        const result = Math.random() > 0.3 ? 'verified' : 'hidden'

        await fetch(`${backendUrl}/api/verification/bot-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Bot-Secret': process.env.BACKEND_SECRET || 'dev-secret',
          },
          body: JSON.stringify({
            requestId,
            nickname,
            serverIp,
            serverPort,
            result,
          }),
        })
      } catch (error) {
        console.error('Mock bot callback failed:', error)
      }
    }, delay)

    this.activeContainers.set(containerId, timeout)
    console.log(`[MockBotDriver] Started verification for ${nickname} on ${serverIp}:${serverPort} (container: ${containerId})`)

    return containerId
  }

  async stopVerification(containerId: string): Promise<void> {
    const timeout = this.activeContainers.get(containerId)
    if (timeout) {
      clearTimeout(timeout)
      this.activeContainers.delete(containerId)
      console.log(`[MockBotDriver] Stopped container: ${containerId}`)
    }
  }

  async startRaceBot(
    raceId: string,
    serverIp: string,
    serverPort: number,
    players: string[],
  ): Promise<string> {
    const containerId = `mock-race-${Date.now()}-${Math.random().toString(36).slice(2)}`

    console.log(
      `[MockBotDriver] Started race bot for ${raceId} on ${serverIp}:${serverPort} (players: ${players.join(', ')})`,
    )

    const sendFinish = async () => {
      const randomPlayer = players[Math.floor(Math.random() * players.length)]
      const randomTime = 30 + Math.random() * 120

      try {
        const backendUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        await fetch(`${backendUrl}/api/race/finish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Bot-Secret': process.env.BACKEND_SECRET || 'dev-secret',
          },
          body: JSON.stringify({
            raceId,
            playerName: randomPlayer,
            finishTime: Math.round(randomTime * 100) / 100,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (error) {
        console.error('[MockBotDriver] Race callback failed:', error)
      }
    }

    setTimeout(() => sendFinish(), 3000)

    const interval = setInterval(async () => {
      await sendFinish()
    }, 10000 + Math.random() * 10000)

    this.activeContainers.set(containerId, interval)
    return containerId
  }

  async stopBot(containerId: string): Promise<void> {
    return this.stopVerification(containerId)
  }

  getActiveCount(): number {
    return this.activeContainers.size
  }
}
