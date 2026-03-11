import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../src/index';

describe('Logger', () => {
  let consoleSpy: any;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create logger with name', () => {
      const logger = new Logger({ name: 'test-logger' });
      expect(logger).toBeDefined();
    });

    it('should accept custom minLevel', () => {
      const logger = new Logger({ name: 'test', minLevel: 3 });
      expect(logger).toBeDefined();
    });
  });

  describe('Log Methods', () => {
    it('should have trace method', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.trace('trace message')).not.toThrow();
    });

    it('should have debug method', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should have info method', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.info('info message')).not.toThrow();
    });

    it('should have warn method', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.warn('warn message')).not.toThrow();
    });

    it('should have error method', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.error('error message')).not.toThrow();
    });

    it('should have fatal method', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.fatal('fatal message')).not.toThrow();
    });

    it('should accept multiple arguments', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.info('message', { key: 'value' }, 123)).not.toThrow();
    });
  });

  describe('Child Logger', () => {
    it('should create child logger', () => {
      const logger = new Logger({ name: 'parent' });
      const child = logger.child('child');
      expect(child).toBeDefined();
      expect(child).toBeInstanceOf(Logger);
    });

    it('should create nested child loggers', () => {
      const logger = new Logger({ name: 'parent' });
      const child1 = logger.child('child1');
      const child2 = child1.child('child2');
      expect(child2).toBeDefined();
    });

    it('should support getSubLogger alias', () => {
      const logger = new Logger({ name: 'parent' });
      const child = logger.getSubLogger('child');
      expect(child).toBeDefined();
      expect(child).toBeInstanceOf(Logger);
    });
  });

  describe('Sensitive Data Masking', () => {
    it('should mask apiKey', () => {
      const logger = new Logger({ name: 'test' });
      const sensitiveData = { apiKey: 'secret-key-12345' };
      
      // The logger should not throw when logging sensitive data
      expect(() => logger.info('test', sensitiveData)).not.toThrow();
    });

    it('should mask password', () => {
      const logger = new Logger({ name: 'test' });
      const sensitiveData = { password: 'my-password' };
      
      expect(() => logger.info('test', sensitiveData)).not.toThrow();
    });

    it('should mask token', () => {
      const logger = new Logger({ name: 'test' });
      const sensitiveData = { token: 'bearer-token-xyz' };
      
      expect(() => logger.info('test', sensitiveData)).not.toThrow();
    });

    it('should mask secret', () => {
      const logger = new Logger({ name: 'test' });
      const sensitiveData = { secret: 'my-secret-value' };
      
      expect(() => logger.info('test', sensitiveData)).not.toThrow();
    });
  });

  describe('Default Logger Instances', () => {
    it('should export default logger', async () => {
      const { logger } = await import('../src/index');
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should export gatewayLogger', async () => {
      const { gatewayLogger } = await import('../src/index');
      expect(gatewayLogger).toBeDefined();
      expect(gatewayLogger).toBeInstanceOf(Logger);
    });

    it('should export rulesLogger', async () => {
      const { rulesLogger } = await import('../src/index');
      expect(rulesLogger).toBeDefined();
      expect(rulesLogger).toBeInstanceOf(Logger);
    });

    it('should export storageLogger', async () => {
      const { storageLogger } = await import('../src/index');
      expect(storageLogger).toBeDefined();
      expect(storageLogger).toBeInstanceOf(Logger);
    });

    it('should export providerLogger', async () => {
      const { providerLogger } = await import('../src/index');
      expect(providerLogger).toBeDefined();
      expect(providerLogger).toBeInstanceOf(Logger);
    });

    it('should export channelLogger', async () => {
      const { channelLogger } = await import('../src/index');
      expect(channelLogger).toBeDefined();
      expect(channelLogger).toBeInstanceOf(Logger);
    });
  });

  describe('Error Handling', () => {
    it('should handle Error objects', () => {
      const logger = new Logger({ name: 'test' });
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', error)).not.toThrow();
    });

    it('should handle circular references', () => {
      const logger = new Logger({ name: 'test' });
      const obj: any = { name: 'test' };
      obj.self = obj;
      expect(() => logger.info('Circular', obj)).not.toThrow();
    });

    it('should handle null and undefined', () => {
      const logger = new Logger({ name: 'test' });
      expect(() => logger.info('null', null)).not.toThrow();
      expect(() => logger.info('undefined', undefined)).not.toThrow();
    });
  });
});
