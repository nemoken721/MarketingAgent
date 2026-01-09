declare module 'ssh2' {
  import { EventEmitter } from 'events';

  export interface ConnectConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: Buffer | string;
    passphrase?: string;
    readyTimeout?: number;
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
  }

  export interface ClientChannel extends EventEmitter {
    on(event: 'close', listener: (code: number, signal: string) => void): this;
    on(event: 'data', listener: (data: Buffer) => void): this;
    stderr: {
      on(event: 'data', listener: (data: Buffer) => void): this;
    };
  }

  export class Client extends EventEmitter {
    connect(config: ConnectConfig): this;
    end(): void;
    exec(
      command: string,
      callback: (err: Error | undefined, stream: ClientChannel) => void
    ): boolean;
    on(event: 'ready', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'timeout', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}
