import { Client } from 'teeworlds';
export interface PlayerInfo {
    clientId: number;
    name: string;
    clan: string;
    skin: string;
    country: number;
    useCustomColor: boolean;
    colorBody: number;
    colorFeet: number;
}
export interface ClientOptions {
    name: string;
    clan?: string;
    skin?: string;
    useCustomColor?: boolean;
    colorBody?: number;
    colorFeet?: number;
    timeout?: number;
    password?: string;
}
/**
 * Teeworlds client wrapper for bot functionality
 * Uses the teeworlds npm package (v2.5.x)
 */
export declare class TeeworldsClient {
    private client;
    private connected;
    private players;
    private options;
    private serverIp;
    private serverPort;
    private onDisconnectHandler;
    private mapName;
    constructor(options: ClientOptions);
    connect(ip: string, port: number): Promise<void>;
    /**
     * Reconnect to the same server
     */
    reconnect(): Promise<void>;
    /**
     * Set a handler for disconnect events (used for auto-reconnect)
     */
    onDisconnect(handler: (reason: string) => void): void;
    private updatePlayersFromSnapshot;
    disconnect(): void;
    /**
     * Gracefully disconnect — flushes queued messages, sends disconnect, and
     * waits for packets to be flushed before returning.
     */
    gracefulDisconnect(waitMs?: number): Promise<void>;
    /**
     * Wait for player list to populate and check if player is online
     */
    findPlayer(nickname: string, waitMs?: number): Promise<PlayerInfo | null>;
    /**
     * Send a chat message
     */
    say(message: string): void;
    /**
     * Flush all queued messages immediately.
     * The teeworlds library queues messages via QueueChunkEx() and only
     * auto-flushes every ~500ms. Call this after say()/whisper() to ensure
     * the message is actually sent over the wire before disconnecting.
     */
    flush(): void;
    /**
     * Send a whisper to a player by name.
     * DDNet /whisper accepts both client_id and player name.
     */
    whisper(nickname: string, message: string): void;
    /**
     * Send team chat message
     */
    teamSay(message: string): void;
    /**
     * Get all online players
     */
    getPlayers(): PlayerInfo[];
    /**
     * Get player by name
     */
    getPlayerByName(name: string): PlayerInfo | undefined;
    isConnected(): boolean;
    getCurrentMap(): string;
    /**
     * Subscribe to chat messages (from players only, client_id >= 0)
     */
    onMessage(handler: (message: {
        author: string;
        text: string;
        team: boolean;
        skin: string;
        colorBody: number;
        colorFeet: number;
        useCustomColor: boolean;
    }) => void): void;
    /**
     * Subscribe to server/system messages (client_id === -1)
     */
    onServerMessage(handler: (text: string) => void): void;
    /**
     * Wait for a server message matching a regex pattern.
     * Returns the full message text or null on timeout.
     */
    waitForServerMessage(pattern: RegExp, timeoutMs: number): Promise<string | null>;
    /**
     * Get raw client for advanced usage
     */
    getRawClient(): Client | null;
    private sleep;
}
