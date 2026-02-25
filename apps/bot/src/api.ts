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

  // =========================================================================
  // Verification callbacks
  // =========================================================================

  async reportVerified(
    requestId: string,
    nickname: string,
    serverIp: string,
    serverPort: number,
  ): Promise<void> {
    await this.post('/api/verification/bot-callback', {
      requestId,
      nickname,
      serverIp,
      serverPort,
      result: 'verified',
    })
  }

  async reportHidden(
    requestId: string,
    nickname: string,
    serverIp: string,
    serverPort: number,
  ): Promise<void> {
    await this.post('/api/verification/bot-callback', {
      requestId,
      nickname,
      serverIp,
      serverPort,
      result: 'hidden',
    })
  }

  async reportNotFound(requestId: string, nickname: string): Promise<void> {
    await this.post('/api/verification/bot-callback', {
      requestId,
      nickname,
      serverIp: '',
      serverPort: 0,
      result: 'not_found',
    })
  }

  async reportError(requestId: string, nickname: string, error: string): Promise<void> {
    await this.post('/api/verification/bot-callback', {
      requestId,
      nickname,
      serverIp: '',
      serverPort: 0,
      result: 'error',
      message: error,
    })
  }

  // =========================================================================
  // Race callbacks
  // =========================================================================

  async getRaceStatus(raceId: string): Promise<unknown> {
    return this.get(`/api/race/${raceId}`)
  }

  // =========================================================================
  // HTTP helpers
  // =========================================================================

  private async post(path: string, data: unknown): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Secret': this.secret,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        console.error(`[API] POST ${path} failed: ${response.status} ${response.statusText}`)
        return null
      }

      console.log(`[API] POST ${path} success`)
      return await response.json()
    } catch (error) {
      console.error(`[API] POST ${path} error:`, error)
      return null
    }
  }

  private async get(path: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          'X-Bot-Secret': this.secret,
        },
      })

      if (!response.ok) {
        console.error(`[API] GET ${path} failed: ${response.status} ${response.statusText}`)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error(`[API] GET ${path} error:`, error)
      return null
    }
  }
}
