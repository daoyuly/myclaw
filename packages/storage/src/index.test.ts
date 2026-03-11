import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Storage, getStorage } from '../src/index';
import { Schemas } from '@myclaw/core';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Storage', () => {
  let storage: Storage;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    testDbPath = path.join(os.tmpdir(), `myclaw-test-${Date.now()}.db`);
    storage = new Storage(testDbPath);
  });

  afterEach(() => {
    storage.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Constructor', () => {
    it('should create storage with custom path', () => {
      expect(storage).toBeDefined();
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should create database directory if not exists', () => {
      const customPath = path.join(os.tmpdir(), 'myclaw-custom-dir', 'test.db');
      const customStorage = new Storage(customPath);
      
      expect(fs.existsSync(path.dirname(customPath))).toBe(true);
      
      customStorage.close();
      fs.unlinkSync(customPath);
      fs.rmdirSync(path.dirname(customPath));
    });
  });

  describe('Rules CRUD', () => {
    it('should save a rule', () => {
      const rule = Schemas.Rule.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: '每天早上 9 点提醒我开会',
        compiled: {
          trigger: 'cron' as const,
          schedule: '0 9 * * *',
          action: 'notify',
          message: '开会时间到了',
          enabled: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => storage.saveRule(rule)).not.toThrow();
    });

    it('should get a rule by id', () => {
      const rule = Schemas.Rule.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: 'test rule',
        compiled: {
          trigger: 'manual' as const,
          action: 'test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      storage.saveRule(rule);
      const retrieved = storage.getRule(rule.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(rule.id);
      expect(retrieved?.natural).toBe(rule.natural);
    });

    it('should return null for non-existent rule', () => {
      const retrieved = storage.getRule('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should get all rules', () => {
      const rule1 = Schemas.Rule.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: 'rule 1',
        compiled: { trigger: 'manual' as const, action: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const rule2 = Schemas.Rule.parse({
        id: '550e8400-e29b-41d4-a716-446655440001',
        natural: 'rule 2',
        compiled: { trigger: 'manual' as const, action: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      storage.saveRule(rule1);
      storage.saveRule(rule2);

      const allRules = storage.getAllRules();
      expect(allRules).toHaveLength(2);
    });

    it('should delete a rule', () => {
      const rule = Schemas.Rule.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: 'test rule',
        compiled: { trigger: 'manual' as const, action: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      storage.saveRule(rule);
      expect(storage.getRule(rule.id)).not.toBeNull();

      storage.deleteRule(rule.id);
      expect(storage.getRule(rule.id)).toBeNull();
    });

    it('should update existing rule', () => {
      const rule = Schemas.Rule.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: 'original',
        compiled: { trigger: 'manual' as const, action: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      storage.saveRule(rule);

      const updatedRule = Schemas.Rule.parse({
        ...rule,
        natural: 'updated',
        updatedAt: new Date(),
      });

      storage.saveRule(updatedRule);

      const retrieved = storage.getRule(rule.id);
      expect(retrieved?.natural).toBe('updated');
    });
  });

  describe('Channels CRUD', () => {
    it('should save a channel', () => {
      const channel = Schemas.ChannelConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440010',
        type: 'telegram' as const,
        name: 'Test Bot',
        config: { token: 'test-token' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => storage.saveChannel(channel)).not.toThrow();
    });

    it('should get all channels', () => {
      const channel1 = Schemas.ChannelConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440010',
        type: 'telegram' as const,
        name: 'Bot 1',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const channel2 = Schemas.ChannelConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440011',
        type: 'discord' as const,
        name: 'Bot 2',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      storage.saveChannel(channel1);
      storage.saveChannel(channel2);

      const allChannels = storage.getAllChannels();
      expect(allChannels).toHaveLength(2);
    });
  });

  describe('Models CRUD', () => {
    it('should save a model', () => {
      const model = Schemas.ModelConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440020',
        provider: 'openai' as const,
        model: 'gpt-4',
        apiKey: 'sk-test',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => storage.saveModel(model)).not.toThrow();
    });

    it('should get all models', () => {
      const model1 = Schemas.ModelConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440020',
        provider: 'openai' as const,
        model: 'gpt-4',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const model2 = Schemas.ModelConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440021',
        provider: 'anthropic' as const,
        model: 'claude-3',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      storage.saveModel(model1);
      storage.saveModel(model2);

      const allModels = storage.getAllModels();
      expect(allModels).toHaveLength(2);
    });
  });

  describe('Permissions CRUD', () => {
    it('should save a permission', () => {
      const permission = Schemas.PermissionConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440030',
        allowRead: ['/path1'],
        allowWrite: ['/path1'],
        deny: ['/path2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => storage.savePermission(permission)).not.toThrow();
    });

    it('should get permission', () => {
      const permission = Schemas.PermissionConfig.parse({
        id: '550e8400-e29b-41d4-a716-446655440030',
        allowRead: ['/path1'],
        allowWrite: ['/path1'],
        deny: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      storage.savePermission(permission);

      const retrieved = storage.getPermission();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.allowRead).toContain('/path1');
    });

    it('should return null when no permission exists', () => {
      const retrieved = storage.getPermission();
      expect(retrieved).toBeNull();
    });
  });

  describe('Singleton', () => {
    it('should return singleton instance', () => {
      const instance1 = getStorage();
      const instance2 = getStorage();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Close', () => {
    it('should close database connection', () => {
      const customStorage = new Storage(testDbPath + '-close-test');
      expect(() => customStorage.close()).not.toThrow();
      
      // Clean up
      if (fs.existsSync(testDbPath + '-close-test')) {
        fs.unlinkSync(testDbPath + '-close-test');
      }
    });
  });
});
