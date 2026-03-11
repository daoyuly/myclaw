/**
 * MyClaw Environment Variable Manager
 * Manages environment variables from multiple sources
 */

import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { logger } from '@myclaw/logger';
import { KeychainManager } from '@myclaw/keychain';

/**
 * Environment variable schema definition
 */
export const EnvVarSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  source: z.enum(['env', 'file', 'keychain', 'default']),
  required: z.boolean().default(false),
  description: z.string().optional(),
  sensitive: z.boolean().default(false),
});

export type EnvVar = z.infer<typeof EnvVarSchema>;

/**
 * Environment variable source
 */
export type EnvSource = 'env' | 'file' | 'keychain' | 'default';

/**
 * Environment Manager configuration
 */
export interface EnvManagerConfig {
  envFile?: string;
  useKeychain?: boolean;
  keychainService?: string;
  defaults?: Record<string, { value: string; description?: string; sensitive?: boolean }>;
}

/**
 * Environment Variable Manager
 *
 * Manages environment variables from multiple sources:
 * - Process environment
 * - .env files
 * - macOS Keychain (for sensitive data)
 * - Default values
 */
export class EnvManager {
  private config: EnvManagerConfig;
  private keychain?: KeychainManager;
  private variables: Map<string, EnvVar> = new Map();

  constructor(config: EnvManagerConfig = {}) {
    this.config = {
      useKeychain: true,
      keychainService: 'com.myclaw.env',
      ...config,
    };

    if (this.config.useKeychain) {
      this.keychain = new KeychainManager({ service: this.config.keychainService });
    }

    logger.debug('EnvManager initialized', { config: this.config });
  }

  /**
   * Load environment variables from all sources
   */
  async load(): Promise<void> {
    logger.info('Loading environment variables...');

    // 1. Load from process.env
    this.loadFromProcess();

    // 2. Load from .env file
    if (this.config.envFile) {
      await this.loadFromFile(this.config.envFile);
    } else {
      // Try default .env location
      const defaultEnvPath = join(process.cwd(), '.env');
      if (existsSync(defaultEnvPath)) {
        await this.loadFromFile(defaultEnvPath);
      }
    }

    // 3. Load defaults
    if (this.config.defaults) {
      this.loadDefaults();
    }

    logger.info('Environment variables loaded', { count: this.variables.size });
  }

  /**
   * Get an environment variable
   */
  get(key: string): string | undefined {
    const envVar = this.variables.get(key);
    return envVar?.value;
  }

  /**
   * Get an environment variable (throws if required and missing)
   */
  getRequired(key: string): string {
    const value = this.get(key);
    if (!value) {
      throw new Error(`Required environment variable not found: ${key}`);
    }
    return value;
  }

  /**
   * Get all environment variables
   */
  getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    this.variables.forEach((envVar, key) => {
      result[key] = envVar.value;
    });
    return result;
  }

  /**
   * Set an environment variable
   */
  async set(key: string, value: string, sensitive = false): Promise<void> {
    const source = sensitive && this.keychain ? 'keychain' : 'env';

    if (sensitive && this.keychain) {
      await this.keychain.set(key, value);
    }

    this.variables.set(key, EnvVarSchema.parse({
      key,
      value,
      source,
      sensitive,
    }));

    // Also set in process.env
    process.env[key] = value;

    logger.debug('Environment variable set', { key, source, sensitive });
  }

  /**
   * Delete an environment variable
   */
  async delete(key: string): Promise<void> {
    const envVar = this.variables.get(key);

    if (envVar?.source === 'keychain' && this.keychain) {
      await this.keychain.delete(key);
    }

    this.variables.delete(key);
    delete process.env[key];

    logger.debug('Environment variable deleted', { key });
  }

  /**
   * Validate required variables
   */
  validate(): void {
    const missing: string[] = [];

    this.variables.forEach((envVar, key) => {
      if (envVar.required && !envVar.value) {
        missing.push(key);
      }
    });

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Export to .env file
   */
  async exportToFile(filePath: string): Promise<void> {
    const lines: string[] = [];

    this.variables.forEach((envVar, key) => {
      if (envVar.source !== 'keychain') {
        const comment = envVar.description ? `# ${envVar.description}\n` : '';
        const value = envVar.sensitive ? '********' : envVar.value;
        lines.push(`${comment}${key}=${value}`);
      }
    });

    await writeFile(filePath, lines.join('\n'), 'utf-8');
    logger.info('Environment variables exported', { file: filePath, count: lines.length });
  }

  /**
   * Get variable metadata
   */
  getMetadata(key: string): EnvVar | undefined {
    return this.variables.get(key);
  }

  // Private methods

  private loadFromProcess(): void {
    Object.entries(process.env).forEach(([key, value]) => {
      if (value !== undefined) {
        this.variables.set(key, EnvVarSchema.parse({
          key,
          value,
          source: 'env',
        }));
      }
    });
  }

  private async loadFromFile(filePath: string): Promise<void> {
    try {
      const result = dotenvConfig({ path: filePath });

      if (result.error) {
        logger.warn('Failed to load .env file', { path: filePath, error: result.error.message });
        return;
      }

      if (result.parsed) {
        Object.entries(result.parsed).forEach(([key, value]) => {
          // Don't override process.env values
          if (!this.variables.has(key)) {
            this.variables.set(key, EnvVarSchema.parse({
              key,
              value,
              source: 'file',
            }));
          }
        });

        logger.debug('Loaded environment variables from file', { path: filePath, count: Object.keys(result.parsed).length });
      }
    } catch (error: any) {
      logger.warn('Failed to load .env file', { path: filePath, error: error.message });
    }
  }

  private loadDefaults(): void {
    if (!this.config.defaults) return;

    Object.entries(this.config.defaults).forEach(([key, config]) => {
      // Only set default if not already set
      if (!this.variables.has(key)) {
        this.variables.set(key, EnvVarSchema.parse({
          key,
          value: config.value,
          source: 'default',
          description: config.description,
          sensitive: config.sensitive,
        }));
      }
    });
  }
}

/**
 * Create an EnvManager instance
 */
export function createEnvManager(config?: EnvManagerConfig): EnvManager {
  return new EnvManager(config);
}
