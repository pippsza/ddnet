import { BaseBotMode } from './base.js';
/**
 * In-game chat mode — relays messages between a web user and in-game server.
 * Default: public chat via say(). Optional: whisper to selected player.
 * Captures messages from ALL players, reports server player list to backend.
 */
export declare class InGameChatMode extends BaseBotMode {
    readonly name = "ingamechat";
    readonly description = "In-game chat relay (public chat + whisper)";
    readonly requiredEnv: string[];
    private sessionId;
    private targetNick;
    private backendUrl;
    private backendSecret;
    private running;
    private pollTimer;
    private sendQueue;
    private lastSendTime;
    private messageBuffer;
    init(config: Record<string, string>): void;
    private reportToBackend;
    private getPlayerList;
    private flushMessageBuffer;
    private pollOutbox;
    /**
     * Process one message from the send queue, respecting DDNet's
     * sv_spamprotection (1 message per second). Sends at most one
     * message per call.
     */
    private processSendQueue;
    run(): Promise<void>;
    cleanup(): Promise<void>;
}
