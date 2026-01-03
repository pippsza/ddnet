import { BaseBotMode } from './base.js';
import { ServerHopper } from '../serverHopper.js';
import { BackendApi } from '../api.js';
/**
 * Verification mode - searches for a player across servers
 * and sends them a verification token via whisper
 */
export class VerificationMode extends BaseBotMode {
    name = 'verification';
    description = 'Search for player and send verification token';
    requiredEnv = [
        'TARGET_NICK',
        'VERIFY_TOKEN',
        'REQUEST_ID',
        'SERVERS_LIST',
        'BACKEND_URL',
        'BACKEND_SECRET',
    ];
    servers = [];
    api = null;
    init(config) {
        super.init(config);
        try {
            this.servers = JSON.parse(config.SERVERS_LIST || '[]');
        }
        catch {
            throw new Error('Failed to parse SERVERS_LIST');
        }
        if (this.servers.length === 0) {
            throw new Error('No servers provided in SERVERS_LIST');
        }
        this.api = new BackendApi(config.BACKEND_URL, config.BACKEND_SECRET);
    }
    async run() {
        const { TARGET_NICK, VERIFY_TOKEN, REQUEST_ID } = this.config;
        const hopper = new ServerHopper(this.servers);
        console.log(`[Verification] Starting for: ${TARGET_NICK}`);
        console.log(`[Verification] Searching across ${this.servers.length} servers`);
        let found = false;
        while (hopper.hasMoreServers()) {
            const server = hopper.getNextServer();
            if (!server)
                break;
            console.log(`[Verification] Connecting to ${server.name || server.ip}:${server.port}...`);
            const client = this.createClient('BingoBot');
            try {
                await client.connect(server.ip, server.port);
                const player = await client.findPlayer(TARGET_NICK);
                if (player) {
                    console.log(`[Verification] Found ${TARGET_NICK} on ${server.ip}:${server.port}`);
                    // Send whisper with token
                    client.whisper(TARGET_NICK, `Your verification code: ${VERIFY_TOKEN}`);
                    // Report to backend
                    await this.api.reportFound(REQUEST_ID, TARGET_NICK, server.ip, server.port);
                    // Stay connected for a bit to ensure message delivery
                    await this.sleep(5000);
                    found = true;
                    client.disconnect();
                    break;
                }
                else {
                    console.log(`[Verification] Player not found on ${server.ip}:${server.port}`);
                }
                client.disconnect();
            }
            catch (error) {
                console.error(`[Verification] Error on ${server.ip}:${server.port}:`, error);
            }
            // Small delay between servers
            await this.sleep(1000);
        }
        if (!found) {
            console.log(`[Verification] Player ${TARGET_NICK} not found on any server`);
            await this.api.reportNotFound(REQUEST_ID, TARGET_NICK);
        }
        console.log('[Verification] Finished');
    }
}
