import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigGenerator } from '../src/index';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('ConfigGenerator', () => {
  let generator: ConfigGenerator;
  let testConfigDir: string;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `myclaw-config-${Date.now()}`);
    
    // Create generator
    generator = new ConfigGenerator({
      configDir: testConfigDir,
    });
  });

  afterEach(() => {
    generator.close();
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true });
    }
  });

  describe('Constructor', () => {
    it('should create generator with options', () => {
      expect(generator).toBeDefined();
    });

    it('should create config directory if not exists', () => {
      expect(fs.existsSync(testConfigDir)).toBe(true);
    });
  });

  describe('generateConfig', () => {
    it('should generate config file', async () => {
      await generator.generateConfig();

      const configPath = path.join(testConfigDir, 'openclaw.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.port).toBe(3210);
      expect(content.host).toBe('0.0.0.0');
    });

    it('should generate valid JSON', async () => {
      await generator.generateConfig();

      const configPath = path.join(testConfigDir, 'openclaw.json');
      const content = fs.readFileSync(configPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('generateEnvFile', () => {
    it('should generate env file', async () => {
      await generator.generateEnvFile();

      const envPath = path.join(testConfigDir, '.env');
      expect(fs.existsSync(envPath)).toBe(true);
    });

    it('should generate empty env file when no models', async () => {
      await generator.generateEnvFile();

      const envPath = path.join(testConfigDir, '.env');
      const content = fs.readFileSync(envPath, 'utf-8');

      expect(content).toBe('');
    });
  });

  describe('Close', () => {
    it('should close without errors', () => {
      expect(() => generator.close()).not.toThrow();
    });
  });
});
