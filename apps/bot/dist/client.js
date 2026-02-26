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
    serverIp = '';
    serverPort = 0;
    onDisconnectHandler = null;
    mapName = '';
    constructor(options) {
        this.options = options;
    }
    async connect(ip, port) {
        this.serverIp = ip;
        this.serverPort = port;
        console.log(`[Client] Attempting connection to ${ip}:${port}`);
        console.log(`[Client] Identity: name="${this.options.name}", clan="${this.options.clan || 'DDashBoard'}", skin="${this.options.skin || 'bot'}"`);
        return new Promise((resolve, reject) => {
            const timeoutMs = this.options.timeout || 10000;
            console.log(`[Client] Connection timeout: ${timeoutMs}ms`);
            const timeout = setTimeout(() => {
                console.log(`[Client] Connection timeout reached after ${timeoutMs}ms`);
                this.disconnect();
                reject(new Error('Connection timeout'));
            }, timeoutMs);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const identity = {
                name: this.options.name,
                clan: this.options.clan || 'DDashBoard',
                skin: this.options.skin || 'bot',
                use_custom_color: this.options.useCustomColor ? 1 : 0,
                color_body: this.options.colorBody ?? 0,
                color_feet: this.options.colorFeet ?? 0,
            };
            this.client = new Client(ip, port, this.options.name, {
                identity,
                ...(this.options.password ? { password: this.options.password } : {}),
            });
            console.log(`[Client] Teeworlds client created, initiating handshake...`);
            // Track map name from connection handshake (fires before 'connected')
            this.client.on('map_change', (...args) => {
                const data = args[0];
                if (data.map_name)
                    this.mapName = data.map_name;
            });
            this.client.on('map_details', (...args) => {
                const data = args[0];
                if (data.map_name)
                    this.mapName = data.map_name;
            });
            this.client.on('connected', () => {
                clearTimeout(timeout);
                this.connected = true;
                console.log(`[Client] Connected to ${ip}:${port} (map: ${this.mapName})`);
                resolve();
            });
            this.client.on('disconnect', (reason) => {
                this.connected = false;
                this.players.clear();
                console.log(`[Client] Disconnected: ${reason}`);
                if (this.onDisconnectHandler) {
                    this.onDisconnectHandler(reason);
                }
            });
            // Update player list from snapshots
            this.client.on('snapshot', () => {
                this.updatePlayersFromSnapshot();
            });
            this.client.connect();
        });
    }
    /**
     * Reconnect to the same server
     */
    async reconnect() {
        if (!this.serverIp || !this.serverPort) {
            throw new Error('No previous connection to reconnect to');
        }
        // Clean up old client
        if (this.client) {
            try {
                this.client.Disconnect();
            }
            catch {
                // Ignore errors on old client
            }
            this.client = null;
        }
        this.connected = false;
        this.players.clear();
        console.log(`[Client] Reconnecting to ${this.serverIp}:${this.serverPort}...`);
        return this.connect(this.serverIp, this.serverPort);
    }
    /**
     * Set a handler for disconnect events (used for auto-reconnect)
     */
    onDisconnect(handler) {
        this.onDisconnectHandler = handler;
    }
    updatePlayersFromSnapshot() {
        if (!this.client)
            return;
        try {
            const clientInfos = this.client.SnapshotUnpacker.AllObjClientInfo;
            this.players.clear();
            for (const info of clientInfos) {
                // Runtime snapshot uses snake_case but TS types may declare camelCase — handle both
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw = info;
                this.players.set(info.clientId, {
                    clientId: info.clientId,
                    name: info.name,
                    clan: info.clan,
                    skin: info.skin,
                    country: info.country,
                    useCustomColor: !!(raw.use_custom_color ?? raw.useCustomColor),
                    colorBody: raw.color_body ?? raw.colorBody ?? 0,
                    colorFeet: raw.color_feet ?? raw.colorFeet ?? 0,
                });
            }
        }
        catch {
            // Snapshot may not be ready yet
        }
    }
    disconnect() {
        this.onDisconnectHandler = null; // Prevent reconnect on intentional disconnect
        if (this.client && this.connected) {
            this.flush(); // flush any queued messages before sending disconnect
            this.client.Disconnect();
            this.connected = false;
            this.players.clear();
        }
    }
    /**
     * Gracefully disconnect — flushes queued messages, sends disconnect, and
     * waits for packets to be flushed before returning.
     */
    async gracefulDisconnect(waitMs = 500) {
        this.flush(); // ensure any queued messages are sent
        await this.sleep(waitMs); // wait for server to process the message
        this.disconnect(); // flush again + send disconnect packet
        await this.sleep(300); // wait for disconnect packet to flush before process exits
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
     * Flush all queued messages immediately.
     * The teeworlds library queues messages via QueueChunkEx() and only
     * auto-flushes every ~500ms. Call this after say()/whisper() to ensure
     * the message is actually sent over the wire before disconnecting.
     */
    flush() {
        if (!this.client)
            return;
        this.client.Flush();
    }
    /**
     * Send a whisper to a player by name.
     * DDNet /whisper accepts both client_id and player name.
     */
    whisper(nickname, message) {
        const player = this.getPlayerByName(nickname);
        if (player) {
            this.say(`/whisper ${player.clientId} ${message}`);
            console.log(`[Client] Whispered to ${nickname} (cid: ${player.clientId})`);
        }
        else {
            // Fallback: DDNet accepts player name directly
            this.say(`/whisper ${nickname} ${message}`);
            console.log(`[Client] Whispered to ${nickname} (by name, no snapshot data)`);
        }
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
    getCurrentMap() {
        return this.mapName;
    }
    /**
     * Subscribe to chat messages (from players only, client_id >= 0)
     */
    onMessage(handler) {
        if (!this.client)
            return;
        this.client.on('message', (msg) => {
            // Skip server messages (client_id === -1, no author)
            if (msg.client_id === -1 || !msg.author?.ClientInfo)
                return;
            // Look up full player info from snapshot for color data
            const player = this.players.get(msg.client_id);
            handler({
                author: msg.author.ClientInfo.name,
                text: msg.message,
                team: !!msg.team,
                skin: msg.author.ClientInfo.skin,
                colorBody: player?.colorBody ?? 0,
                colorFeet: player?.colorFeet ?? 0,
                useCustomColor: player?.useCustomColor ?? false,
            });
        });
    }
    /**
     * Subscribe to server/system messages (client_id === -1)
     */
    onServerMessage(handler) {
        if (!this.client)
            return;
        this.client.on('message', (msg) => {
            if (msg.client_id === -1) {
                handler(msg.message);
            }
        });
    }
    /**
     * Wait for a server message matching a regex pattern.
     * Returns the full message text or null on timeout.
     */
    waitForServerMessage(pattern, timeoutMs) {
        return new Promise((resolve) => {
            if (!this.client) {
                resolve(null);
                return;
            }
            const emitter = this.client; // eslint-disable-line @typescript-eslint/no-explicit-any
            const listener = (msg) => {
                if (msg.client_id !== -1)
                    return;
                if (pattern.test(msg.message)) {
                    clearTimeout(timeout);
                    emitter.off('message', listener);
                    resolve(msg.message);
                }
            };
            const timeout = setTimeout(() => {
                emitter.off('message', listener);
                resolve(null);
            }, timeoutMs);
            emitter.on('message', listener);
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
