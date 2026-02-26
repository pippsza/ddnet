/**
 * Backend API client for bot callbacks
 */
export declare class BackendApi {
    private baseUrl;
    private secret;
    constructor(baseUrl: string, secret: string);
    reportVerified(requestId: string, nickname: string, serverIp: string, serverPort: number): Promise<void>;
    reportHidden(requestId: string, nickname: string, serverIp: string, serverPort: number): Promise<void>;
    reportNotFound(requestId: string, nickname: string): Promise<void>;
    reportError(requestId: string, nickname: string, error: string): Promise<void>;
    getRaceStatus(raceId: string): Promise<unknown>;
    private post;
    private get;
}
