import { Client } from 'teeworlds';
/**
 * Teeworlds client wrapper for bot functionality
 * Uses the teeworlds npm package (v2.5.x)
 */
export class TeeworldsClient {
    client = null;
    connected = false;
    players = new Map();
    options;
    constructor(options) {
        this.options = options;
    }
    async connect(ip, port) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.disconnect();
                reject(new Error('Connection timeout'));
            }, this.options.timeout || 10000);
            this.client = new Client(ip, port, this.options.name, {
                identity: {
                    name: this.options.name,
                    clan: this.options.clan || 'DDNet',
                    skin: this.options.skin || 'default',
                },
            });
            this.client.on('connected', () => {
                clearTimeout(timeout);
                this.connected = true;
                console.log(`[Client] Connected to ${ip}:${port}`);
                resolve();
            });
            this.client.on('disconnect', (reason) => {
                this.connected = false;
                this.players.clear();
                console.log(`[Client] Disconnected: ${reason}`);
            });
            // Update player list from snapshots
            this.client.on('snapshot', () => {
                this.updatePlayersFromSnapshot();
            });
            this.client.connect();
        });
    }
    updatePlayersFromSnapshot() {
        if (!this.client)
            return;
        try {
            const clientInfos = this.client.SnapshotUnpacker.AllObjClientInfo;
            this.players.clear();
            for (const info of clientInfos) {
                this.players.set(info.clientId, {
                    clientId: info.clientId,
                    name: info.name,
                    clan: info.clan,
                    skin: info.skin,
                    country: info.country,
                });
            }
        }
        catch {
            // Snapshot may not be ready yet
        }
    }
    disconnect() {
        if (this.client && this.connected) {
            this.client.Disconnect();
            this.connected = false;
            this.players.clear();
        }
    }
    /**
     * Wait for player list to populate and check if player is online
     */
    async findPlayer(nickname, waitMs = 3000) {
        await this.sleep(waitMs);
        for (const player of this.players.values()) {
            if (player.name.toLowerCase() === nickname.toLowerCase()) {
                return player;
            }
        }
        return null;
    }
    /**
     * Send a chat message
     */
    say(message) {
        if (!this.client || !this.connected) {
            throw new Error('Not connected');
        }
        this.client.game.Say(message);
    }
    /**
     * Send a whisper to a player
     */
    whisper(nickname, message) {
        this.say(`/w "${nickname}" ${message}`);
        console.log(`[Client] Whispered to ${nickname}`);
    }
    /**
     * Send team chat message
     */
    teamSay(message) {
        if (!this.client || !this.connected) {
            throw new Error('Not connected');
        }
        this.client.game.SayTeam(message);
    }
    /**
     * Get all online players
     */
    getPlayers() {
        return Array.from(this.players.values());
    }
    /**
     * Get player by name
     */
    getPlayerByName(name) {
        for (const player of this.players.values()) {
            if (player.name.toLowerCase() === name.toLowerCase()) {
                return player;
            }
        }
        return undefined;
    }
    isConnected() {
        return this.connected;
    }
    /**
     * Subscribe to chat messages
     */
    onMessage(handler) {
        if (!this.client)
            return;
        this.client.on('message', (msg) => {
            handler({
                author: msg.author.name,
                text: msg.message,
                team: msg.team,
            });
        });
    }
    /**
     * Get raw client for advanced usage
     */
    getRawClient() {
        return this.client;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
