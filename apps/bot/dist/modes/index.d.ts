import type { BotMode } from './base.js';
/**
 * Registry of all available bot modes
 */
export declare const modes: Record<string, () => BotMode>;
/**
 * Get a mode by name
 */
export declare function getMode(name: string): BotMode | null;
/**
 * List all available modes with descriptions
 */
export declare function listModes(): {
    name: string;
    description: string;
    requiredEnv: string[];
}[];
export { BotMode, BaseBotMode } from './base.js';
export { VerificationMode } from './verification.js';
export { ChatbotMode } from './chatbot.js';
export { MonitorMode } from './monitor.js';
export { RaceMode } from './race.js';
export { TestMode } from './test.js';
export { InGameChatMode } from './ingamechat.js';
