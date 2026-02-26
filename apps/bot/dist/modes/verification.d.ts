import { BaseBotMode } from './base.js';
/**
 * Verification mode - connects to a server, logs in, and uses /verify
 * to check if a player is authenticated on the DDNet server.
 */
export declare class VerificationMode extends BaseBotMode {
    readonly name = "verification";
    readonly description = "Verify player identity via /verify command on DDNet server";
    readonly requiredEnv: string[];
    private api;
    init(config: Record<string, string>): void;
    run(): Promise<void>;
    private escapeRegex;
}
