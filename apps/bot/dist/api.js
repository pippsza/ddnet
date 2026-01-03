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
    async reportFound(requestId, nickname, serverIp, serverPort) {
        await this.sendCallback({
            requestId,
            nickname,
            serverIp,
            serverPort,
            found: true,
        });
    }
    async reportNotFound(requestId, nickname) {
        await this.sendCallback({
            requestId,
            nickname,
            serverIp: '',
            serverPort: 0,
            found: false,
        });
    }
    async sendCallback(data) {
        try {
            const response = await fetch(`${this.baseUrl}/api/verification/bot-callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Secret': this.secret,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                console.error(`[API] Callback failed: ${response.status} ${response.statusText}`);
            }
            else {
                console.log(`[API] Callback sent successfully`);
            }
        }
        catch (error) {
            console.error(`[API] Callback error:`, error);
        }
    }
}
