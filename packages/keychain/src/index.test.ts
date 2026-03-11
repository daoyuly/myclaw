import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeychainManager, getKeychainManager } from '../src/index';
import { exec } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('KeychainManager', () => {
  let manager: KeychainManager;
  const mockExec = exec as any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new KeychainManager({ service: 'test.myclaw' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create manager with default service', () => {
      const defaultManager = new KeychainManager();
      expect(defaultManager).toBeDefined();
    });

    it('should create manager with custom service', () => {
      const customManager = new KeychainManager({ service: 'custom.service' });
      expect(customManager).toBeDefined();
    });
  });

  describe('set', () => {
    it('should store a secret successfully', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });

      await expect(manager.set('test-key', 'test-value')).resolves.not.toThrow();
    });

    it('should handle storage errors', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('Keychain error'), { stdout: '', stderr: '' });
      });

      await expect(manager.set('test-key', 'test-value')).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should retrieve a secret successfully', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'test-value\n', stderr: '' });
      });

      const value = await manager.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent secret', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        const error = new Error('The specified item could not be found in the keychain');
        callback(error, { stdout: '', stderr: '' });
      });

      const value = await manager.get('non-existent');
      expect(value).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('Unexpected error'), { stdout: '', stderr: '' });
      });

      await expect(manager.get('test-key')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a secret successfully', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });

      await expect(manager.delete('test-key')).resolves.not.toThrow();
    });

    it('should handle non-existent key gracefully', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        const error = new Error('The specified item could not be found in the keychain');
        callback(error, { stdout: '', stderr: '' });
      });

      await expect(manager.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing secret', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: 'test-value\n', stderr: '' });
      });

      const exists = await manager.exists('test-key');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent secret', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        const error = new Error('The specified item could not be found in the keychain');
        callback(error, { stdout: '', stderr: '' });
      });

      const exists = await manager.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all keys', async () => {
      const mockDump = `
"clas"<uint32>=<uint32>:0x00000001
"svce"<blob>="test.myclaw"
"acct"<blob>="key1"
"svce"<blob>="test.myclaw"
"acct"<blob>="key2"
"svce"<blob>="other.service"
"acct"<blob>="key3"
      `;

      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: mockDump, stderr: '' });
      });

      const keys = await manager.list();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('key3');
    });

    it('should handle list errors gracefully', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('Failed to dump keychain'), { stdout: '', stderr: '' });
      });

      const keys = await manager.list();
      expect(keys).toEqual([]);
    });
  });

  describe('Singleton', () => {
    it('should return singleton instance', () => {
      const instance1 = getKeychainManager({ service: 'test' });
      const instance2 = getKeychainManager();

      expect(instance1).toBe(instance2);
    });
  });
});
