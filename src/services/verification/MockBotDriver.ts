import type { BotDriverInterface } from './types'

/**
 * Mock bot driver for local development
 * Simulates bot behavior without actual Docker containers
 */
export class MockBotDriver implements BotDriverInterface {
  private activeContainers = new Map<string, NodeJS.Timeout>()

  async startVerification(nickname: string, token: string, requestId: string): Promise<string> {
    const containerId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`

    // Simulate bot finding player after 5-15 seconds
    const delay = 5000 + Math.random() * 10000

    const timeout = setTimeout(async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        await fetch(`${backendUrl}/api/verification/bot-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Bot-Secret': process.env.BACKEND_SECRET || 'dev-secret',
          },
          body: JSON.stringify({
            requestId,
            nickname,
            serverIp: '127.0.0.1',
            serverPort: 8303,
            found: true,
          }),
        })
      } catch (error) {
        console.error('Mock bot callback failed:', error)
      }
    }, delay)

    this.activeContainers.set(containerId, timeout)
    console.log(`[MockBotDriver] Started verification for ${nickname} (container: ${containerId})`)

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

  getActiveCount(): number {
    return this.activeContainers.size
  }
}
