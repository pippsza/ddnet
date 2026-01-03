import { BaseBotMode } from './base.js';
/**
 * Verification mode - searches for a player across servers
 * and sends them a verification token via whisper
 */
export declare class VerificationMode extends BaseBotMode {
    readonly name = "verification";
    readonly description = "Search for player and send verification token";
    readonly requiredEnv: string[];
    private servers;
    private api;
    init(config: Record<string, string>): void;
    run(): Promise<void>;
}
