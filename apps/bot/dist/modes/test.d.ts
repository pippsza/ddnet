import { BaseBotMode } from './base.js';
/**
 * Test mode — connects to a server for admin debugging.
 * Relays all messages to the backend, polls for outgoing messages.
 */
export declare class TestMode extends BaseBotMode {
    readonly name = "test";
    readonly description = "Interactive test bot for admin debugging";
    readonly requiredEnv: string[];
    private sessionId;
    private backendUrl;
    private backendSecret;
    private running;
    private pollTimer;
    private messageBuffer;
    private deliveryBuffer;
    private recentlySent;
    init(config: Record<string, string>): void;
    private reportToBackend;
    private flushMessageBuffer;
    private pollOutbox;
    run(): Promise<void>;
    cleanup(): Promise<void>;
}
