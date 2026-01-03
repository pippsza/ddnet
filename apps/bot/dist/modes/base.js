import { TeeworldsClient } from '../client.js';
/**
 * Abstract base class for bot modes with common functionality
 */
export class BaseBotMode {
    config = {};
    client = null;
    init(config) {
        this.config = config;
        this.validateConfig();
    }
    validateConfig() {
        const missing = this.requiredEnv.filter((key) => !this.config[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }
    createClient(name) {
        this.client = new TeeworldsClient({
            name,
            clan: 'DDNet',
            skin: 'default',
            timeout: 15000,
        });
        return this.client;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async cleanup() {
        if (this.client?.isConnected()) {
            this.client.disconnect();
        }
    }
}
