import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@myclaw/logger';

const execAsync = promisify(exec);

/**
 * Keychain service configuration
 */
export interface KeychainConfig {
  service: string;
  account: string;
}

/**
 * Keychain entry
 */
export interface KeychainEntry {
  service: string;
  account: string;
  password: string;
}

/**
 * Keychain Manager
 * 
 * Provides secure storage using macOS Keychain
 */
export class KeychainManager {
  private service: string;

  constructor(config?: { service?: string }) {
    this.service = config?.service || 'com.myclaw.keys';
    logger.debug('KeychainManager initialized', { service: this.service });
  }

  /**
   * Store a secret in macOS Keychain
   */
  async set(key: string, value: string): Promise<void> {
    logger.debug('Storing secret in Keychain', { key });

    try {
      // Delete existing entry first (to avoid duplicates)
      await this.delete(key).catch(() => {
        // Ignore errors if key doesn't exist
      });

      // Add new entry
      const command = `security add-generic-password \
        -a "${key}" \
        -s "${this.service}" \
        -w "${value}"`;

      await execAsync(command);
      logger.info('Secret stored in Keychain', { key });
    } catch (error: any) {
      logger.error('Failed to store secret', { key, error: error.message });
      throw new Error(`Failed to store secret: ${error.message}`);
    }
  }

  /**
   * Retrieve a secret from macOS Keychain
   */
  async get(key: string): Promise<string | null> {
    logger.debug('Retrieving secret from Keychain', { key });

    try {
      const command = `security find-generic-password \
        -a "${key}" \
        -s "${this.service}" \
        -w`;

      const { stdout } = await execAsync(command);
      const value = stdout.trim();

      if (!value) {
        logger.debug('Secret not found', { key });
        return null;
      }

      logger.debug('Secret retrieved from Keychain', { key });
      return value;
    } catch (error: any) {
      if (error.message?.includes('could not be found')) {
        logger.debug('Secret not found', { key });
        return null;
      }

      logger.error('Failed to retrieve secret', { key, error: error.message });
      throw new Error(`Failed to retrieve secret: ${error.message}`);
    }
  }

  /**
   * Delete a secret from macOS Keychain
   */
  async delete(key: string): Promise<void> {
    logger.debug('Deleting secret from Keychain', { key });

    try {
      const command = `security delete-generic-password \
        -a "${key}" \
        -s "${this.service}"`;

      await execAsync(command);
      logger.info('Secret deleted from Keychain', { key });
    } catch (error: any) {
      if (error.message?.includes('could not be found')) {
        logger.debug('Secret not found for deletion', { key });
        return;
      }

      logger.error('Failed to delete secret', { key, error: error.message });
      throw new Error(`Failed to delete secret: ${error.message}`);
    }
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * List all keys for this service
   */
  async list(): Promise<string[]> {
    logger.debug('Listing all keys in Keychain');

    try {
      const command = `security dump-keychain`;

      const { stdout } = await execAsync(command);
      const keys: string[] = [];

      // Parse keychain dump to find entries for this service
      const lines = stdout.split('\n');
      let currentService = '';

      for (const line of lines) {
        if (line.includes('"svce"')) {
          const match = line.match(/<blob>="([^"]+)"/);
          if (match) {
            currentService = match[1];
          }
        }

        if (line.includes('"acct"') && currentService === this.service) {
          const match = line.match(/<blob>="([^"]+)"/);
          if (match) {
            keys.push(match[1]);
          }
        }
      }

      logger.debug('Found keys in Keychain', { count: keys.length });
      return keys;
    } catch (error: any) {
      logger.error('Failed to list keys', { error: error.message });
      return [];
    }
  }
}

/**
 * Singleton instance
 */
let instance: KeychainManager | null = null;

export function getKeychainManager(config?: { service?: string }): KeychainManager {
  if (!instance) {
    instance = new KeychainManager(config);
  }
  return instance;
}
