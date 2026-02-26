import { BaseBotMode } from './base.js';
import { BackendApi } from '../api.js';
import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 3000;
const SAY_DELAY_MS = 1200; // DDNet sv_spamprotection ~1s between messages
const STATUS_POLL_MS = 5000; // Poll backend for game status changes
/**
 * Race mode — cosmetic announcer.
 *
 * Connects to the game server, watches for DDNet finish messages, and announces
 * results in chat for the "alive game" feeling. The bot does NOT report finishes
 * to the backend — a server-side job (gameProgressJob) polls DDNet API and
 * handles all scoring independently.
 *
 * The bot polls the backend for game status changes (surrender, cancel, completion)
 * and announces the result before gracefully disconnecting.
 */
export class RaceMode extends BaseBotMode {
    name = 'race';
    description = 'Monitor server for race finishes';
    requiredEnv = [
        'RACE_ID',
        'SERVER_IP',
        'SERVER_PORT',
        'PLAYERS_LIST',
        'MAPS_LIST',
        'BACKEND_URL',
        'BACKEND_SECRET',
    ];
    api = null;
    racePlayers = [];
    raceMaps = [];
    currentStep = 0;
    currentMap = '';
    stopping = false;
    reconnectAttempts = 0;
    isFirstConnect = true;
    connectedClient = null;
    statusPollTimer = null;
    resolveRun = null;
    logFile = null;
    log(...args) {
        const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        const line = `[${new Date().toISOString()}] ${msg}`;
        console.log(msg);
        if (this.logFile) {
            try {
                appendFileSync(this.logFile, line + '\n');
            }
            catch {
                // Log file write failed — don't recurse
            }
        }
    }
    init(config) {
        super.init(config);
        // Set up file logging if LOG_FILE is provided
        if (config.LOG_FILE) {
            this.logFile = config.LOG_FILE;
            try {
                mkdirSync(dirname(this.logFile), { recursive: true });
                appendFileSync(this.logFile, `\n=== Race bot started at ${new Date().toISOString()} ===\n`);
            }
            catch (err) {
                console.error('[Race] Failed to initialize log file:', err);
            }
        }
        try {
            this.racePlayers = JSON.parse(config.PLAYERS_LIST || '[]');
        }
        catch {
            throw new Error('Failed to parse PLAYERS_LIST');
        }
        try {
            this.raceMaps = JSON.parse(config.MAPS_LIST || '[]');
            this.raceMaps.sort((a, b) => a.position - b.position);
        }
        catch {
            throw new Error('Failed to parse MAPS_LIST');
        }
        if (this.racePlayers.length === 0) {
            throw new Error('No players provided in PLAYERS_LIST');
        }
        this.log(`[Race] Initialized with ${this.racePlayers.length} players and ${this.raceMaps.length} maps`);
        this.log(`[Race] Players: ${this.racePlayers.join(', ')}`);
        this.log(`[Race] Maps: ${this.raceMaps.map((m) => `${m.position}: ${m.mapName}`).join(', ')}`);
        this.log(`[Race] Log file: ${this.logFile || '(none)'}`);
        this.api = new BackendApi(config.BACKEND_URL, config.BACKEND_SECRET);
    }
    async run() {
        const { RACE_ID, SERVER_IP, SERVER_PORT } = this.config;
        this.log(`[Race] Starting race monitor for game ${RACE_ID}`);
        this.log(`[Race] Server: ${SERVER_IP}:${SERVER_PORT}`);
        // Create client once and reuse via reconnect()
        const client = this.createClient('RaceBot');
        this.connectedClient = client;
        // Set up auto-reconnect
        client.onDisconnect((reason) => {
            if (this.stopping)
                return;
            this.reconnectAttempts++;
            this.log(`[Race] Disconnected: ${reason}. Reconnecting (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
                this.log(`[Race] ERROR: Max reconnect attempts reached. Giving up.`);
                this.stopping = true;
                this.resolveRun?.();
                return;
            }
            setTimeout(async () => {
                if (this.stopping)
                    return;
                try {
                    await client.reconnect();
                    this.reconnectAttempts = 0;
                    this.currentMap = client.getCurrentMap();
                    this.log(`[Race] Reconnected successfully (map: "${this.currentMap}")`);
                    this.attachHandlers(client);
                }
                catch (err) {
                    this.log(`[Race] ERROR: Reconnect failed:`, err);
                }
            }, RECONNECT_DELAY_MS);
        });
        // Initial connection
        try {
            this.log(`[Race] Connecting to ${SERVER_IP}:${parseInt(SERVER_PORT)}...`);
            await client.connect(SERVER_IP, parseInt(SERVER_PORT));
            this.reconnectAttempts = 0;
            this.log(`[Race] Connected successfully`);
            this.currentMap = client.getCurrentMap();
            this.log(`[Race] Initial map from connection: "${this.currentMap}"`);
            this.attachHandlers(client);
            // Wait for connection to settle
            await this.sleep(3000);
            // Announce first map
            const expectedMap = this.getExpectedMap();
            if (expectedMap) {
                await this.sayWithDelay(client, `Race started! Current map: ${expectedMap.mapName} (step ${this.currentStep + 1}/${this.raceMaps.length})`);
                this.log(`[Race] Announced first map: ${expectedMap.mapName}`);
            }
            else {
                await this.sayWithDelay(client, `Race started! Monitoring finishes...`);
            }
            this.isFirstConnect = false;
        }
        catch (error) {
            this.log('[Race] ERROR: Initial connection failed:', error);
        }
        // Start polling backend for game status changes
        this.startStatusPolling(client);
        // Wait until the bot decides to stop
        await new Promise((resolve) => {
            this.resolveRun = resolve;
            process.on('SIGTERM', () => {
                this.log('[Race] Received SIGTERM');
                this.stopping = true;
                resolve();
            });
            process.on('SIGINT', () => {
                this.log('[Race] Received SIGINT');
                this.stopping = true;
                resolve();
            });
        });
        if (this.statusPollTimer) {
            clearInterval(this.statusPollTimer);
            this.statusPollTimer = null;
        }
    }
    /**
     * Attach all event handlers to the client.
     * Called after initial connect AND after each reconnect.
     */
    attachHandlers(client) {
        client.onServerMessage(async (text) => {
            this.log(`[Race] Server msg: ${text}`);
            await this.handleServerMessage(client, text);
        });
        client.onMessage((msg) => {
            this.log(`[Race] Chat: <${msg.author}> ${msg.text}`);
        });
        const rawClient = client.getRawClient();
        if (rawClient) {
            rawClient.on('map_change', (...args) => {
                const data = args[0];
                if (data.map_name && data.map_name !== this.currentMap) {
                    const oldMap = this.currentMap;
                    this.currentMap = data.map_name;
                    this.log(`[Race] Map change: ${oldMap || '(none)'} -> ${this.currentMap}`);
                }
            });
            rawClient.on('map_details', (...args) => {
                const data = args[0];
                if (data.map_name && data.map_name !== this.currentMap) {
                    const oldMap = this.currentMap;
                    this.currentMap = data.map_name;
                    this.log(`[Race] Map details: ${oldMap || '(none)'} -> ${this.currentMap}`);
                }
            });
        }
        this.log(`[Race] Event handlers attached`);
    }
    getExpectedMap() {
        return this.raceMaps.find((m) => m.position === this.currentStep);
    }
    async sayWithDelay(client, message) {
        if (!client.isConnected()) {
            this.log(`[Race] Cannot say (disconnected): ${message}`);
            return;
        }
        client.say(message);
        client.flush();
        await this.sleep(SAY_DELAY_MS);
    }
    /**
     * Parse a DDNet finish message. Supports two formats:
     * 1) DDRace: "pippsza finished in: 0 minute(s) 13.44 second(s)"
     * 2) Standard: "'PlayerName' finished in 01:23.45"
     */
    parseFinishMessage(text) {
        const ddraceRegex = /^(?:\*{3}\s+)?(.+?)\s+finished in:\s*(\d+)\s+minute\(s\)\s+([\d.]+)\s+second\(s\)/i;
        const ddraceMatch = text.match(ddraceRegex);
        if (ddraceMatch) {
            const [, name, mins, secs] = ddraceMatch;
            return {
                playerName: name.trim().replace(/^'+|'+$/g, ''),
                finishTime: parseInt(mins) * 60 + parseFloat(secs),
            };
        }
        const standardRegex = /^'?(.+?)'?\s+finished in\s+(\d+):(\d+)\.(\d+)/i;
        const standardMatch = text.match(standardRegex);
        if (standardMatch) {
            const [, name, mins, secs, cs] = standardMatch;
            return {
                playerName: name.trim().replace(/^'+|'+$/g, ''),
                finishTime: parseInt(mins) * 60 + parseInt(secs) + parseInt(cs) / 100,
            };
        }
        return null;
    }
    /**
     * Handle a server message — purely cosmetic announcements.
     * No backend calls. Local step tracking for immediate UX.
     */
    async handleServerMessage(client, text) {
        const parsed = this.parseFinishMessage(text);
        if (!parsed)
            return;
        const { playerName: trimmedName, finishTime } = parsed;
        const isRacePlayer = this.racePlayers.some((p) => p.toLowerCase() === trimmedName.toLowerCase());
        if (!isRacePlayer) {
            this.log(`[Race] Finish by non-participant: "${trimmedName}" (ignoring)`);
            return;
        }
        this.log(`[Race] Finish detected: "${trimmedName}" in ${finishTime.toFixed(2)}s on map "${this.currentMap}"`);
        // Check if the finish is on the expected map
        const expectedMap = this.getExpectedMap();
        const mapUsed = this.currentMap || expectedMap?.mapName || '';
        if (expectedMap && this.currentMap) {
            const isCorrectMap = expectedMap.mapName.toLowerCase() === this.currentMap.toLowerCase();
            if (!isCorrectMap) {
                this.log(`[Race] Wrong map! Expected "${expectedMap.mapName}", got "${this.currentMap}"`);
                await this.sayWithDelay(client, `${trimmedName} finished "${this.currentMap}" but the current race map is "${expectedMap.mapName}"!`);
                return;
            }
        }
        // Advance step locally and announce immediately
        this.currentStep++;
        const timeStr = this.formatTime(finishTime);
        const isLastStep = this.currentStep >= this.raceMaps.length;
        const nextMap = this.getExpectedMap();
        const nextInfo = !isLastStep && nextMap ? ` | Next: ${nextMap.mapName} (step ${this.currentStep + 1}/${this.raceMaps.length})` : '';
        await this.sayWithDelay(client, `${trimmedName} scored! Finished "${mapUsed}" in ${timeStr}${nextInfo}`);
        if (isLastStep) {
            this.log(`[Race] All steps completed locally — waiting for backend to confirm results`);
        }
    }
    formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        if (mins > 0) {
            return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
        }
        return `${secs.toFixed(2)}s`;
    }
    /**
     * Poll backend every few seconds to detect game status changes.
     * Handles: surrender, cancel, and natural completion (set by gameProgressJob).
     * Also syncs local currentStep with backend to self-correct drift.
     */
    pollingInFlight = false;
    startStatusPolling(client) {
        this.statusPollTimer = setInterval(async () => {
            if (this.stopping || this.pollingInFlight)
                return;
            this.pollingInFlight = true;
            try {
                const status = await this.api.getRaceStatus(this.config.RACE_ID);
                if (!status) {
                    this.pollingInFlight = false;
                    return;
                }
                const gameStatus = status.gameStatus;
                // Game still running — sync local step upward only
                if (gameStatus === 'in_progress') {
                    // Only sync UP — backend may lag behind the bot's optimistic local tracking
                    const backendStep = status.currentStep ?? 0;
                    if (backendStep > this.currentStep) {
                        this.log(`[Race] Step sync UP: local=${this.currentStep} -> backend=${backendStep}`);
                        this.currentStep = backendStep;
                    }
                    this.pollingInFlight = false;
                    return;
                }
                this.log(`[Race] Status poll: gameStatus=${gameStatus}, surrenderedByTeam=${status.surrenderedByTeam}, winnerTeam=${status.winnerTeam}`);
                // Stop polling immediately to avoid duplicate announcements
                if (this.statusPollTimer) {
                    clearInterval(this.statusPollTimer);
                    this.statusPollTimer = null;
                }
                this.stopping = true;
                await this.announceGameEnd(client, status);
                await client.gracefulDisconnect();
                this.log('[Race] Gracefully disconnected after game end');
                this.resolveRun?.();
            }
            catch (err) {
                this.log('[Race] ERROR: Status poll error:', err);
                this.pollingInFlight = false;
            }
        }, STATUS_POLL_MS);
    }
    /**
     * Announce game end results in chat before disconnecting.
     */
    async announceGameEnd(client, status) {
        if (!client.isConnected()) {
            this.log('[Race] Not connected, skipping game end announcement');
            return;
        }
        if (status.gameStatus === 'cancelled') {
            await this.sayWithDelay(client, 'Race has been cancelled.');
        }
        else if (status.surrenderedByTeam !== undefined && status.surrenderedByTeam !== null) {
            // Surrender
            const surrenderedTeam = status.teams?.[status.surrenderedByTeam];
            const surrenderedName = surrenderedTeam?.name || `Team ${status.surrenderedByTeam + 1}`;
            await this.sayWithDelay(client, `${surrenderedName} surrendered!`);
            if (status.winnerTeam !== undefined && status.winnerTeam !== null) {
                const winnerTeam = status.teams?.[status.winnerTeam];
                const winnerName = winnerTeam?.name || `Team ${status.winnerTeam + 1}`;
                await this.sayWithDelay(client, `${winnerName} wins! GG`);
            }
        }
        else if (status.gameStatus === 'completed') {
            // Natural completion (all steps done, scored by gameProgressJob)
            if (status.winnerTeam !== undefined && status.winnerTeam !== null) {
                const winnerTeam = status.teams?.[status.winnerTeam];
                const winnerName = winnerTeam?.name || `Team ${status.winnerTeam + 1}`;
                await this.sayWithDelay(client, `Race complete! ${winnerName} wins! GG`);
            }
            else {
                await this.sayWithDelay(client, `Race complete! GG`);
            }
        }
    }
}
