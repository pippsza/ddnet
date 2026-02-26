import { BaseBotMode } from './base.js';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;
const POLL_INTERVAL_MS = 500;
/**
 * Test mode — connects to a server for admin debugging.
 * Relays all messages to the backend, polls for outgoing messages.
 */
export class TestMode extends BaseBotMode {
    name = 'test';
    description = 'Interactive test bot for admin debugging';
    requiredEnv = ['SERVER_IP', 'SERVER_PORT', 'SESSION_ID', 'BACKEND_URL', 'BACKEND_SECRET'];
    sessionId = '';
    backendUrl = '';
    backendSecret = '';
    running = false;
    pollTimer = null;
    messageBuffer = [];
    deliveryBuffer = [];
    recentlySent = [];
    init(config) {
        super.init(config);
        this.sessionId = config.SESSION_ID;
        this.backendUrl = config.BACKEND_URL;
        this.backendSecret = config.BACKEND_SECRET;
    }
    async reportToBackend(body) {
        try {
            await fetch(`${this.backendUrl}/api/admin/container-test/bot-callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Secret': this.backendSecret,
                },
                body: JSON.stringify({ sessionId: this.sessionId, ...body }),
            });
        }
        catch (error) {
            console.error('[Test] Failed to report to backend:', error);
        }
    }
    async flushMessageBuffer() {
        if (this.messageBuffer.length === 0 && this.deliveryBuffer.length === 0)
            return;
        const messages = [...this.messageBuffer];
        const deliveries = [...this.deliveryBuffer];
        this.messageBuffer = [];
        this.deliveryBuffer = [];
        await this.reportToBackend({ type: 'messages', messages, deliveries });
    }
    async pollOutbox() {
        try {
            const res = await fetch(`${this.backendUrl}/api/admin/container-test/bot-callback?sessionId=${this.sessionId}`, {
                headers: { 'X-Bot-Secret': this.backendSecret },
            });
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
                for (const msg of data.messages) {
                    if (this.client?.isConnected()) {
                        console.log(`[Test] Sending: ${msg}`);
                        this.recentlySent.push(msg);
                        this.client.say(msg);
                        this.client.flush();
                    }
                }
            }
        }
        catch (error) {
            // Silently fail — backend might be temporarily unavailable
        }
    }
    async run() {
        const { SERVER_IP, SERVER_PORT } = this.config;
        const botName = this.config.BOT_NAME || 'TestBot';
        const serverPassword = this.config.SERVER_PASSWORD || undefined;
        const port = parseInt(SERVER_PORT, 10);
        this.running = true;
        console.log(`[Test] Starting as "${botName}"`);
        console.log(`[Test] Session: ${this.sessionId}`);
        console.log(`[Test] Backend: ${this.backendUrl}`);
        console.log(`[Test] Connecting to ${SERVER_IP}:${port}${serverPassword ? ' (with password)' : ''}`);
        const client = this.createClient(botName, serverPassword);
        // Auto-reconnect handler
        let reconnectAttempts = 0;
        client.onDisconnect(async (reason) => {
            console.log(`[Test] Disconnected: ${reason}`);
            await this.reportToBackend({ type: 'status', status: 'disconnected' });
            this.messageBuffer.push({
                author: 'System',
                text: `Disconnected: ${reason}`,
                isServer: true,
                isOwn: false,
                timestamp: new Date().toISOString(),
            });
            await this.flushMessageBuffer();
            if (!this.running)
                return;
            while (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this.running) {
                reconnectAttempts++;
                console.log(`[Test] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
                await this.sleep(RECONNECT_DELAY_MS);
                try {
                    await client.reconnect();
                    reconnectAttempts = 0;
                    await this.reportToBackend({ type: 'status', status: 'connected' });
                    this.messageBuffer.push({
                        author: 'System',
                        text: 'Reconnected',
                        isServer: true,
                        isOwn: false,
                        timestamp: new Date().toISOString(),
                    });
                    return;
                }
                catch (error) {
                    console.error(`[Test] Reconnect failed:`, error);
                }
            }
            console.log('[Test] Max reconnect attempts reached');
        });
        // Connect
        try {
            await client.connect(SERVER_IP, port);
        }
        catch (error) {
            console.error('[Test] Initial connection failed:', error);
            await this.reportToBackend({ type: 'status', status: 'disconnected' });
            this.messageBuffer.push({
                author: 'System',
                text: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
                isServer: true,
                isOwn: false,
                timestamp: new Date().toISOString(),
            });
            await this.flushMessageBuffer();
            return;
        }
        await this.reportToBackend({ type: 'status', status: 'connected' });
        this.messageBuffer.push({
            author: 'System',
            text: `Connected to ${SERVER_IP}:${port}`,
            isServer: true,
            isOwn: false,
            timestamp: new Date().toISOString(),
        });
        // Listen for player messages (detect own echoes as delivery confirmations)
        client.onMessage(({ author, text, team, skin }) => {
            if (author === botName) {
                const echoIdx = this.recentlySent.indexOf(text);
                if (echoIdx !== -1) {
                    this.recentlySent.splice(echoIdx, 1);
                    console.log(`[Test] Delivered: ${text}`);
                    this.deliveryBuffer.push(text);
                }
                return;
            }
            console.log(`[Test] Chat: <${author}> ${text}`);
            this.messageBuffer.push({
                author,
                text: team ? `[team] ${text}` : text,
                isServer: false,
                isOwn: false,
                timestamp: new Date().toISOString(),
                skin,
            });
        });
        // Listen for server messages
        client.onServerMessage(async (text) => {
            const lower = text.toLowerCase();
            // Detect login requirement
            if (lower.includes('login first') || lower.includes('have to login') || lower.includes('must login')) {
                console.log(`[Test] Server requires login: ${text}`);
                await this.reportToBackend({ type: 'status', status: 'login_required' });
            }
            // Detect login success
            if (lower.includes('welcome back')) {
                console.log(`[Test] Login successful: ${text}`);
                await this.reportToBackend({ type: 'status', status: 'connected' });
            }
            // Detect login failure
            if (lower.includes('no user found') || lower.includes('wrong password') || lower.includes('login failed')) {
                console.log(`[Test] Login failed: ${text}`);
                await this.reportToBackend({ type: 'status', status: 'login_failed' });
            }
            console.log(`[Test] Server: ${text}`);
            this.messageBuffer.push({
                author: 'Server',
                text,
                isServer: true,
                isOwn: false,
                timestamp: new Date().toISOString(),
            });
        });
        // Start poll loop: flush messages to backend + poll outbox
        this.pollTimer = setInterval(async () => {
            await this.flushMessageBuffer();
            await this.pollOutbox();
        }, POLL_INTERVAL_MS);
        console.log('[Test] Ready. Listening for messages and polling outbox.');
        // Keep running until interrupted
        await new Promise((resolve) => {
            const shutdown = () => {
                this.running = false;
                resolve();
            };
            process.on('SIGTERM', shutdown);
            process.on('SIGINT', shutdown);
        });
    }
    async cleanup() {
        this.running = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        // Flush remaining messages
        await this.flushMessageBuffer();
        await this.reportToBackend({ type: 'status', status: 'stopped' });
        await super.cleanup();
    }
}
