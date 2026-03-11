/**
 * MyClaw Logger
 * Structured logging using tslog
 */

import { Logger as TsLogger, ILogObj } from 'tslog';
import { inspect } from 'util';

export interface LoggerConfig {
  name: string;
  minLevel?: number;
  prettyLogTemplate?: string;
}

export class Logger {
  private logger: TsLogger<ILogObj>;

  constructor(config: LoggerConfig) {
    this.logger = new TsLogger({
      name: config.name,
      minLevel: config.minLevel ?? 0,
      prettyLogTemplate: config.prettyLogTemplate,
      prettyInspectOptions: {
        colors: true,
        depth: 10,
        compact: false,
      },
      maskValuesOfKeys: ['apiKey', 'password', 'token', 'secret'],
    });
  }

  trace(message: string, ...args: unknown[]): void {
    this.logger.trace(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.logger.debug(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.logger.info(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args);
  }

  fatal(message: string, ...args: unknown[]): void {
    this.logger.fatal(message, ...args);
  }

  child(name: string): Logger {
    return new Logger({ name: `${this.logger.settings.name}:${name}` });
  }

  getSubLogger(name: string): Logger {
    return this.child(name);
  }
}

// Default logger instance
export const logger = new Logger({ name: 'myclaw' });

// Create specialized loggers
export const gatewayLogger = logger.getSubLogger('gateway');
export const rulesLogger = logger.getSubLogger('rules');
export const storageLogger = logger.getSubLogger('storage');
export const providerLogger = logger.getSubLogger('provider');
export const channelLogger = logger.getSubLogger('channel');
