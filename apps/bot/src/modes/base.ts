import { TeeworldsClient } from '../client.js'

/**
 * Base interface for all bot modes
 */
export interface BotMode {
  /** Unique mode name */
  readonly name: string

  /** Mode description */
  readonly description: string

  /** Required environment variables */
  readonly requiredEnv: string[]

  /** Initialize the mode with configuration */
  init(config: Record<string, string>): void

  /** Run the mode logic */
  run(): Promise<void>

  /** Cleanup resources */
  cleanup(): Promise<void>
}

/**
 * Abstract base class for bot modes with common functionality
 */
export abstract class BaseBotMode implements BotMode {
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly requiredEnv: string[]

  protected config: Record<string, string> = {}
  protected client: TeeworldsClient | null = null

  init(config: Record<string, string>): void {
    this.config = config
    this.validateConfig()
  }

  protected validateConfig(): void {
    const missing = this.requiredEnv.filter((key) => !this.config[key])
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }

  protected createClient(name: string, password?: string, skinOptions?: {
    skin?: string
    useCustomColor?: boolean
    colorBody?: number
    colorFeet?: number
  }): TeeworldsClient {
    this.client = new TeeworldsClient({
      name,
      clan: 'DDNet',
      skin: skinOptions?.skin || 'default',
      useCustomColor: skinOptions?.useCustomColor,
      colorBody: skinOptions?.colorBody,
      colorFeet: skinOptions?.colorFeet,
      timeout: 15000,
      ...(password ? { password } : {}),
    })
    return this.client
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  abstract run(): Promise<void>

  async cleanup(): Promise<void> {
    if (this.client?.isConnected()) {
      await this.client.gracefulDisconnect()
    }
  }
}
