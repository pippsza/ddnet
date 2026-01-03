declare module 'teeworlds' {
  export interface ClientIdentity {
    name: string
    clan?: string
    skin?: string
    country?: number
    colorBody?: number
    colorFeet?: number
  }

  export interface ClientOptions {
    identity?: ClientIdentity
    password?: string
    ddnet_version?: { major: number; minor: number; patch: number }
    timeout?: number
  }

  export interface ObjClientInfo {
    clientId: number
    name: string
    clan: string
    skin: string
    country: number
    colorBody: number
    colorFeet: number
  }

  export interface SnapshotUnpacker {
    AllObjClientInfo: ObjClientInfo[]
  }

  export interface Game {
    Say(message: string): void
    SayTeam(message: string): void
    SetTeam(team: number): void
    Kill(): void
  }

  export interface Movement {
    RunLeft(): void
    RunRight(): void
    StopRunning(): void
    Jump(): void
    StopJump(): void
    Fire(): void
    StopFire(): void
    Hook(): void
    StopHook(): void
    SetAim(x: number, y: number): void
    SetWeapon(weapon: number): void
  }

  export interface MessageEvent {
    message: string
    author: {
      clientId: number
      name: string
      clan: string
    }
    team: boolean
  }

  export interface KillEvent {
    killer: {
      clientId: number
      name: string
    }
    victim: {
      clientId: number
      name: string
    }
    weapon: number
  }

  export class Client {
    constructor(ip: string, port: number, name: string, options?: ClientOptions)

    SnapshotUnpacker: SnapshotUnpacker
    game: Game
    movement: Movement

    connect(): void
    Disconnect(): void

    on(event: 'connected', handler: () => void): void
    on(event: 'disconnect', handler: (reason: string) => void): void
    on(event: 'snapshot', handler: () => void): void
    on(event: 'message', handler: (msg: MessageEvent) => void): void
    on(event: 'kill', handler: (kill: KillEvent) => void): void
    on(event: string, handler: (...args: unknown[]) => void): void
  }

  export default {
    Client,
  }
}
