/**
 * Backend API client for bot callbacks
 */
export class BackendApi {
  private baseUrl: string
  private secret: string

  constructor(baseUrl: string, secret: string) {
    this.baseUrl = baseUrl
    this.secret = secret
  }

  async reportFound(
    requestId: string,
    nickname: string,
    serverIp: string,
    serverPort: number,
  ): Promise<void> {
    await this.sendCallback({
      requestId,
      nickname,
      serverIp,
      serverPort,
      found: true,
    })
  }

  async reportNotFound(requestId: string, nickname: string): Promise<void> {
    await this.sendCallback({
      requestId,
      nickname,
      serverIp: '',
      serverPort: 0,
      found: false,
    })
  }

  private async sendCallback(data: {
    requestId: string
    nickname: string
    serverIp: string
    serverPort: number
    found: boolean
  }): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/verification/bot-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Secret': this.secret,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        console.error(`[API] Callback failed: ${response.status} ${response.statusText}`)
      } else {
        console.log(`[API] Callback sent successfully`)
      }
    } catch (error) {
      console.error(`[API] Callback error:`, error)
    }
  }
}
