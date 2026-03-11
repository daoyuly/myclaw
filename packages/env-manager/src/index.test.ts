import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { EnvManager, createEnvManager } from './index';

describe('EnvManager', () => {
  const testEnvFile = join(process.cwd(), '.env.test');
  let envManager: EnvManager;

  beforeEach(() => {
    envManager = new EnvManager({ useKeychain: false });
  });

  afterEach(() => {
    // Clean up test .env file
    if (existsSync(testEnvFile)) {
      unlinkSync(testEnvFile);
    }
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const manager = new EnvManager();
      expect(manager).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const manager = new EnvManager({
        envFile: '.env.custom',
        useKeychain: false,
      });
      expect(manager).toBeDefined();
    });
  });

  describe('load', () => {
    it('should load from process.env', async () => {
      process.env.TEST_VAR = 'test_value';
      await envManager.load();

      expect(envManager.get('TEST_VAR')).toBe('test_value');
      delete process.env.TEST_VAR;
    });

    it('should load from .env file', async () => {
      // Create test .env file
      writeFileSync(testEnvFile, 'FILE_VAR=file_value\nFILE_VAR2=file_value2');

      const manager = new EnvManager({
        envFile: testEnvFile,
        useKeychain: false,
      });
      await manager.load();

      expect(manager.get('FILE_VAR')).toBe('file_value');
      expect(manager.get('FILE_VAR2')).toBe('file_value2');
    });

    it('should load defaults', async () => {
      const manager = new EnvManager({
        useKeychain: false,
        defaults: {
          DEFAULT_VAR: {
            value: 'default_value',
            description: 'A default value',
          },
        },
      });
      await manager.load();

      expect(manager.get('DEFAULT_VAR')).toBe('default_value');
      const metadata = manager.getMetadata('DEFAULT_VAR');
      expect(metadata?.source).toBe('default');
      expect(metadata?.description).toBe('A default value');
    });

    it('should not override process.env with file values', async () => {
      process.env.PRIORITY_TEST = 'from_process';
      writeFileSync(testEnvFile, 'PRIORITY_TEST=from_file');

      const manager = new EnvManager({
        envFile: testEnvFile,
        useKeychain: false,
      });
      await manager.load();

      expect(manager.get('PRIORITY_TEST')).toBe('from_process');
      delete process.env.PRIORITY_TEST;
    });
  });

  describe('get', () => {
    it('should return undefined for missing variable', () => {
      expect(envManager.get('MISSING_VAR')).toBeUndefined();
    });

    it('should return value for existing variable', async () => {
      await envManager.set('TEST_GET', 'value');
      expect(envManager.get('TEST_GET')).toBe('value');
    });
  });

  describe('getRequired', () => {
    it('should throw for missing required variable', () => {
      expect(() => envManager.getRequired('MISSING_REQUIRED')).toThrow(
        'Required environment variable not found: MISSING_REQUIRED'
      );
    });

    it('should return value for existing variable', async () => {
      await envManager.set('TEST_REQUIRED', 'value');
      expect(envManager.getRequired('TEST_REQUIRED')).toBe('value');
    });
  });

  describe('set', () => {
    it('should set environment variable', async () => {
      await envManager.set('TEST_SET', 'new_value');
      expect(envManager.get('TEST_SET')).toBe('new_value');
      expect(process.env.TEST_SET).toBe('new_value');
      delete process.env.TEST_SET;
    });

    it('should set in process.env', async () => {
      await envManager.set('TEST_PROCESS_ENV', 'process_value');
      expect(process.env.TEST_PROCESS_ENV).toBe('process_value');
      delete process.env.TEST_PROCESS_ENV;
    });
  });

  describe('delete', () => {
    it('should delete environment variable', async () => {
      await envManager.set('TEST_DELETE', 'to_delete');
      expect(envManager.get('TEST_DELETE')).toBe('to_delete');

      await envManager.delete('TEST_DELETE');
      expect(envManager.get('TEST_DELETE')).toBeUndefined();
    });

    it('should delete from process.env', async () => {
      await envManager.set('TEST_DELETE_PROCESS', 'value');
      expect(process.env.TEST_DELETE_PROCESS).toBeDefined();

      await envManager.delete('TEST_DELETE_PROCESS');
      expect(process.env.TEST_DELETE_PROCESS).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all variables', async () => {
      await envManager.set('VAR1', 'value1');
      await envManager.set('VAR2', 'value2');

      const all = envManager.getAll();
      expect(all.VAR1).toBe('value1');
      expect(all.VAR2).toBe('value2');
    });
  });

  describe('validate', () => {
    it('should pass when all required variables are set', async () => {
      // process.env has many variables, so validation should pass
      expect(() => envManager.validate()).not.toThrow();
    });
  });

  describe('createEnvManager', () => {
    it('should create EnvManager instance', () => {
      const manager = createEnvManager();
      expect(manager).toBeInstanceOf(EnvManager);
    });

    it('should create with config', () => {
      const manager = createEnvManager({ useKeychain: false });
      expect(manager).toBeDefined();
    });
  });
});
