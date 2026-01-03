import { Client } from 'teeworlds';
export interface PlayerInfo {
    clientId: number;
    name: string;
    clan: string;
    skin: string;
    country: number;
}
export interface ClientOptions {
    name: string;
    clan?: string;
    skin?: string;
    timeout?: number;
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
    constructor(options: ClientOptions);
    connect(ip: string, port: number): Promise<void>;
    private updatePlayersFromSnapshot;
    disconnect(): void;
    /**
     * Wait for player list to populate and check if player is online
     */
    findPlayer(nickname: string, waitMs?: number): Promise<PlayerInfo | null>;
    /**
     * Send a chat message
     */
    say(message: string): void;
    /**
     * Send a whisper to a player
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
    /**
     * Subscribe to chat messages
     */
    onMessage(handler: (message: {
        author: string;
        text: string;
        team: boolean;
    }) => void): void;
    /**
     * Get raw client for advanced usage
     */
    getRawClient(): Client | null;
    private sleep;
}
