import { BaseBotMode } from './base.js';
/**
 * Chatbot mode - connects to a server and responds to chat commands
 * Useful for server moderation or providing info to players
 */
export declare class ChatbotMode extends BaseBotMode {
    readonly name = "chatbot";
    readonly description = "Interactive chatbot that responds to commands";
    readonly requiredEnv: string[];
    private commandPrefix;
    private commands;
    init(config: Record<string, string>): void;
    private registerDefaultCommands;
    /**
     * Register a custom command handler
     */
    registerCommand(name: string, handler: (author: string, args: string[]) => void): void;
    run(): Promise<void>;
}
