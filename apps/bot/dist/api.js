/**
 * Backend API client for bot callbacks
 */
export class BackendApi {
    baseUrl;
    secret;
    constructor(baseUrl, secret) {
        this.baseUrl = baseUrl;
        this.secret = secret;
    }
    // =========================================================================
    // Verification callbacks
    // =========================================================================
    async reportVerified(requestId, nickname, serverIp, serverPort) {
        await this.post('/api/verification/bot-callback', {
            requestId,
            nickname,
            serverIp,
            serverPort,
            result: 'verified',
        });
    }
    async reportHidden(requestId, nickname, serverIp, serverPort) {
        await this.post('/api/verification/bot-callback', {
            requestId,
            nickname,
            serverIp,
            serverPort,
            result: 'hidden',
        });
    }
    async reportNotFound(requestId, nickname) {
        await this.post('/api/verification/bot-callback', {
            requestId,
            nickname,
            serverIp: '',
            serverPort: 0,
            result: 'not_found',
        });
    }
    async reportError(requestId, nickname, error) {
        await this.post('/api/verification/bot-callback', {
            requestId,
            nickname,
            serverIp: '',
            serverPort: 0,
            result: 'error',
            message: error,
        });
    }
    // =========================================================================
    // Race callbacks
    // =========================================================================
    async getRaceStatus(raceId) {
        return this.get(`/api/race/${raceId}`);
    }
    // =========================================================================
    // HTTP helpers
    // =========================================================================
    async post(path, data) {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Secret': this.secret,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                console.error(`[API] POST ${path} failed: ${response.status} ${response.statusText}`);
                return null;
            }
            console.log(`[API] POST ${path} success`);
            return await response.json();
        }
        catch (error) {
            console.error(`[API] POST ${path} error:`, error);
            return null;
        }
    }
    async get(path) {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                headers: {
                    'X-Bot-Secret': this.secret,
                },
            });
            if (!response.ok) {
                console.error(`[API] GET ${path} failed: ${response.status} ${response.statusText}`);
                return null;
            }
            return await response.json();
        }
        catch (error) {
            console.error(`[API] GET ${path} error:`, error);
            return null;
        }
    }
}
