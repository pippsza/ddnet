import { VerificationMode } from './verification.js';
import { ChatbotMode } from './chatbot.js';
import { MonitorMode } from './monitor.js';
/**
 * Registry of all available bot modes
 */
export const modes = {
    verification: () => new VerificationMode(),
    chatbot: () => new ChatbotMode(),
    monitor: () => new MonitorMode(),
};
/**
 * Get a mode by name
 */
export function getMode(name) {
    const factory = modes[name];
    return factory ? factory() : null;
}
/**
 * List all available modes with descriptions
 */
export function listModes() {
    return Object.entries(modes).map(([name, factory]) => {
        const mode = factory();
        return {
            name,
            description: mode.description,
            requiredEnv: mode.requiredEnv,
        };
    });
}
export { BaseBotMode } from './base.js';
export { VerificationMode } from './verification.js';
export { ChatbotMode } from './chatbot.js';
export { MonitorMode } from './monitor.js';
