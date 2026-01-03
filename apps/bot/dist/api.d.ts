/**
 * Backend API client for bot callbacks
 */
export declare class BackendApi {
    private baseUrl;
    private secret;
    constructor(baseUrl: string, secret: string);
    reportFound(requestId: string, nickname: string, serverIp: string, serverPort: number): Promise<void>;
    reportNotFound(requestId: string, nickname: string): Promise<void>;
    private sendCallback;
}
