import { BaseBotMode } from './base.js';
/**
 * Race mode — cosmetic announcer.
 *
 * Connects to the game server, watches for DDNet finish messages, and announces
 * results in chat for the "alive game" feeling. The bot does NOT report finishes
 * to the backend — a server-side job (gameProgressJob) polls DDNet API and
 * handles all scoring independently.
 *
 * The bot polls the backend for game status changes (surrender, cancel, completion)
 * and announces the result before gracefully disconnecting.
 */
export declare class RaceMode extends BaseBotMode {
    readonly name = "race";
    readonly description = "Monitor server for race finishes";
    readonly requiredEnv: string[];
    private api;
    private racePlayers;
    private raceMaps;
    private currentStep;
    private currentMap;
    private stopping;
    private reconnectAttempts;
    private isFirstConnect;
    private connectedClient;
    private statusPollTimer;
    private resolveRun;
    private logFile;
    private log;
    init(config: Record<string, string>): void;
    run(): Promise<void>;
    /**
     * Attach all event handlers to the client.
     * Called after initial connect AND after each reconnect.
     */
    private attachHandlers;
    private getExpectedMap;
    private sayWithDelay;
    /**
     * Parse a DDNet finish message. Supports two formats:
     * 1) DDRace: "pippsza finished in: 0 minute(s) 13.44 second(s)"
     * 2) Standard: "'PlayerName' finished in 01:23.45"
     */
    private parseFinishMessage;
    /**
     * Handle a server message — purely cosmetic announcements.
     * No backend calls. Local step tracking for immediate UX.
     */
    private handleServerMessage;
    private formatTime;
    /**
     * Poll backend every few seconds to detect game status changes.
     * Handles: surrender, cancel, and natural completion (set by gameProgressJob).
     * Also syncs local currentStep with backend to self-correct drift.
     */
    private pollingInFlight;
    private startStatusPolling;
    /**
     * Announce game end results in chat before disconnecting.
     */
    private announceGameEnd;
}
