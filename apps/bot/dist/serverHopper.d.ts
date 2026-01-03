export interface ServerInfo {
    ip: string;
    port: number;
    name?: string;
}
/**
 * Server hopping manager for bot verification
 */
export declare class ServerHopper {
    private servers;
    private currentIndex;
    constructor(servers: ServerInfo[]);
    private shuffleServers;
    getNextServer(): ServerInfo | null;
    hasMoreServers(): boolean;
    getRemainingCount(): number;
    reset(): void;
}
