import { TeeworldsClient } from '../client.js';
/**
 * Base interface for all bot modes
 */
export interface BotMode {
    /** Unique mode name */
    readonly name: string;
    /** Mode description */
    readonly description: string;
    /** Required environment variables */
    readonly requiredEnv: string[];
    /** Initialize the mode with configuration */
    init(config: Record<string, string>): void;
    /** Run the mode logic */
    run(): Promise<void>;
    /** Cleanup resources */
    cleanup(): Promise<void>;
}
/**
 * Abstract base class for bot modes with common functionality
 */
export declare abstract class BaseBotMode implements BotMode {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly requiredEnv: string[];
    protected config: Record<string, string>;
    protected client: TeeworldsClient | null;
    init(config: Record<string, string>): void;
    protected validateConfig(): void;
    protected createClient(name: string): TeeworldsClient;
    protected sleep(ms: number): Promise<void>;
    abstract run(): Promise<void>;
    cleanup(): Promise<void>;
}
