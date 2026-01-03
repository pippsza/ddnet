import { BaseBotMode } from './base.js';
/**
 * Monitor mode - watches a server and tracks player activity
 * Can report to a webhook or log player statistics
 */
export declare class MonitorMode extends BaseBotMode {
    readonly name = "monitor";
    readonly description = "Monitor server and track player activity";
    readonly requiredEnv: string[];
    private playerActivity;
    private webhookUrl;
    private pollInterval;
    init(config: Record<string, string>): void;
    run(): Promise<void>;
    private notifyPlayerJoin;
    private notifyPlayerLeave;
    private printStats;
}
