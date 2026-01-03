/**
 * Server hopping manager for bot verification
 */
export class ServerHopper {
    servers;
    currentIndex = 0;
    constructor(servers) {
        this.servers = servers;
        // Shuffle servers to distribute load
        this.shuffleServers();
    }
    shuffleServers() {
        for (let i = this.servers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.servers[i], this.servers[j]] = [this.servers[j], this.servers[i]];
        }
    }
    getNextServer() {
        if (this.currentIndex >= this.servers.length) {
            return null;
        }
        return this.servers[this.currentIndex++];
    }
    hasMoreServers() {
        return this.currentIndex < this.servers.length;
    }
    getRemainingCount() {
        return this.servers.length - this.currentIndex;
    }
    reset() {
        this.currentIndex = 0;
        this.shuffleServers();
    }
}
