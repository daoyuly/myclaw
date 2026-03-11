import { writeFile, mkdir } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@myclaw/logger';
import { Storage } from '@myclaw/storage';

/**
 * OpenClaw Gateway Configuration
 */
export interface OpenClawConfig {
  // Basic settings
  port?: number;
  host?: string;
  
  // Logging
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  // Channels (simplified for config file)
  channels?: Array<{
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    config: Record<string, any>;
  }>;
  
  // Models (simplified for config file)
  models?: Array<{
    id: string;
    provider: string;
    model: string;
    enabled: boolean;
    isDefault: boolean;
  }>;
  
  // Permissions (simplified for config file)
  permissions?: {
    id: string;
    allowRead: string[];
    allowWrite: string[];
    deny: string[];
  };
  
  // Environment variables
  env?: Record<string, string>;
}

/**
 * Configuration Generator Options
 */
export interface ConfigGeneratorOptions {
  configDir: string;
  dbPath?: string;
}

/**
 * Configuration Generator
 * 
 * Generates OpenClaw configuration files from stored settings
 */
export class ConfigGenerator {
  private configDir: string;
  private storage: Storage;
  private options: ConfigGeneratorOptions;

  constructor(options: ConfigGeneratorOptions) {
    this.options = options;
    this.configDir = options.configDir;
    
    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    
    const dbPath = options.dbPath || join(options.configDir, 'myclaw.db');
    this.storage = new Storage(dbPath);
    logger.info('ConfigGenerator initialized', { configDir: options.configDir });
  }

  /**
   * Generate OpenClaw configuration file
   */
  async generateConfig(): Promise<void> {
    logger.info('Generating OpenClaw configuration...');

    // Load configuration from storage
    const channels = this.storage.getAllChannels();
    const models = this.storage.getAllModels();
    const permissions = this.storage.getPermission();

    // Build config object
    const config: OpenClawConfig = {
      port: 3210,
      host: '0.0.0.0',
      logLevel: 'info',
    };

    // Add channels
    if (channels.length > 0) {
      config.channels = channels.map(ch => ({
        id: ch.id,
        type: ch.type,
        name: ch.name,
        enabled: ch.enabled,
        config: this.maskSensitiveConfig(ch.config),
      }));
    }

    // Add models
    if (models.length > 0) {
      config.models = models.map(m => ({
        id: m.id,
        provider: m.provider,
        model: m.model,
        enabled: m.enabled,
        isDefault: m.isDefault,
      }));
    }

    // Add permissions
    if (permissions) {
      config.permissions = {
        id: permissions.id,
        allowRead: permissions.allowRead,
        allowWrite: permissions.allowWrite,
        deny: permissions.deny,
      };
    }

    // Ensure config directory exists
    if (!existsSync(this.configDir)) {
      await mkdir(this.configDir, { recursive: true });
    }

    // Write config file
    const configPath = join(this.configDir, 'openclaw.json');
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    logger.info('Configuration generated', { path: configPath });
  }

  /**
   * Generate environment variables file
   */
  async generateEnvFile(): Promise<void> {
    logger.info('Generating environment variables file...');

    const models = this.storage.getAllModels();
    const envVars: string[] = [];

    // Add model API keys
    for (const model of models) {
      if (model.apiKey) {
        const keyName = `${model.provider.toUpperCase()}_API_KEY`;
        envVars.push(`${keyName}=${model.apiKey}`);
      }
      if (model.baseUrl) {
        const keyName = `${model.provider.toUpperCase()}_BASE_URL`;
        envVars.push(`${keyName}=${model.baseUrl}`);
      }
    }

    // Add channel tokens
    const channels = this.storage.getAllChannels();
    for (const channel of channels) {
      if (channel.config.token) {
        const keyName = `${channel.type.toUpperCase()}_TOKEN`;
        envVars.push(`${keyName}=${channel.config.token}`);
      }
    }

    // Write .env file
    const envPath = join(this.configDir, '.env');
    await writeFile(envPath, envVars.join('\n'), 'utf-8');

    logger.info('Environment file generated', { path: envPath });
  }

  /**
   * Mask sensitive configuration values
   */
  private maskSensitiveConfig(config: Record<string, any>): Record<string, any> {
    const masked = { ...config };
    const sensitiveKeys = ['token', 'apiKey', 'password', 'secret'];

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        masked[key] = '***MASKED***';
      }
    }

    return masked;
  }

  /**
   * Close storage connection
   */
  close(): void {
    this.storage.close();
    logger.info('ConfigGenerator closed');
  }
}

/**
 * Get singleton instance
 */
let instance: ConfigGenerator | null = null;

export function getConfigGenerator(options?: ConfigGeneratorOptions): ConfigGenerator {
  if (!instance && options) {
    instance = new ConfigGenerator(options);
  }
  return instance!;
}
