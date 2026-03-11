import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RuleEngine, createRuleEngine } from '../src/index';
import { Storage } from '@myclaw/storage';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('RuleEngine', () => {
  let engine: RuleEngine;
  let storage: Storage;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = path.join(os.tmpdir(), `myclaw-rule-test-${Date.now()}.db`);
    storage = new Storage(testDbPath);
    engine = createRuleEngine(storage);
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('parse', () => {
    it('should parse daily morning rule', () => {
      const result = engine.parse('每天早上 9 点提醒我开会');
      
      expect(result.success).toBe(true);
      expect(result.rule?.trigger).toBe('cron');
      expect(result.rule?.schedule).toBe('0 9 * * *');
      expect(result.rule?.action).toBe('notify');
    });

    it('should parse daily afternoon rule', () => {
      const result = engine.parse('每天下午 3 点通知我休息');
      
      expect(result.success).toBe(true);
      expect(result.rule?.trigger).toBe('cron');
      expect(result.rule?.schedule).toBe('0 15 * * *');
      expect(result.rule?.action).toBe('notify');
    });

    it('should parse simple time rule', () => {
      const result = engine.parse('每天 9 点提醒我');
      
      expect(result.success).toBe(true);
      expect(result.rule?.schedule).toBe('0 9 * * *');
    });

    it('should parse hourly rule', () => {
      const result = engine.parse('每小时提醒我喝水');
      
      expect(result.success).toBe(true);
      expect(result.rule?.schedule).toBe('0 * * * *');
    });

    it('should parse weekly rule', () => {
      const result = engine.parse('每周一 9 点提醒我开会');
      
      expect(result.success).toBe(true);
      expect(result.rule?.schedule).toBe('0 9 * * 1');
    });

    it('should parse event-based rule', () => {
      const result = engine.parse('当收到邮件时提醒我');
      
      expect(result.success).toBe(true);
      expect(result.rule?.trigger).toBe('event');
      expect(result.rule?.conditions?.event).toContain('收到邮件');
    });

    it('should extract quoted message', () => {
      const result = engine.parse('每天 9 点提醒我 "开会时间到了"');
      
      expect(result.success).toBe(true);
      expect(result.rule?.message).toBe('开会时间到了');
    });

    it('should extract message after "说"', () => {
      const result = engine.parse('每天 9 点提醒我说开会时间到了');
      
      expect(result.success).toBe(true);
      expect(result.rule?.message).toContain('开会时间到了');
    });

    it('should return error for unparseable rule', () => {
      const result = engine.parse('这是一条无法解析的规则');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createRule', () => {
    it('should create a rule from natural language', async () => {
      const rule = await engine.createRule('每天 9 点提醒我开会');
      
      expect(rule.id).toBeDefined();
      expect(rule.natural).toBe('每天 9 点提醒我开会');
      expect(rule.compiled.trigger).toBe('cron');
      expect(rule.compiled.enabled).toBe(true);
    });

    it('should save rule to storage', async () => {
      const rule = await engine.createRule('每天 9 点提醒我开会');
      
      const retrieved = storage.getRule(rule.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.natural).toBe('每天 9 点提醒我开会');
    });

    it('should throw error for unparseable rule', async () => {
      await expect(
        engine.createRule('无法解析的规则')
      ).rejects.toThrow();
    });
  });

  describe('getRule', () => {
    it('should get an existing rule', async () => {
      const created = await engine.createRule('每天 9 点提醒我开会');
      const retrieved = engine.getRule(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent rule', () => {
      const retrieved = engine.getRule('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('getAllRules', () => {
    it('should return all rules', async () => {
      await engine.createRule('每天 9 点提醒我开会');
      await engine.createRule('每天 10 点提醒我休息');
      
      const rules = engine.getAllRules();
      expect(rules).toHaveLength(2);
    });

    it('should return empty array when no rules', () => {
      const rules = engine.getAllRules();
      expect(rules).toHaveLength(0);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const created = await engine.createRule('每天 9 点提醒我开会');
      const updated = engine.updateRule(created.id, {
        natural: '每天 10 点提醒我开会',
      });
      
      expect(updated).not.toBeNull();
      expect(updated?.natural).toBe('每天 10 点提醒我开会');
    });

    it('should return null for non-existent rule', () => {
      const updated = engine.updateRule('non-existent-id', {
        natural: 'updated',
      });
      
      expect(updated).toBeNull();
    });
  });

  describe('deleteRule', () => {
    it('should delete an existing rule', async () => {
      const created = await engine.createRule('每天 9 点提醒我开会');
      const deleted = engine.deleteRule(created.id);
      
      expect(deleted).toBe(true);
      expect(storage.getRule(created.id)).toBeNull();
    });

    it('should return false for non-existent rule', () => {
      const deleted = engine.deleteRule('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('enableRule', () => {
    it('should enable a rule', async () => {
      const created = await engine.createRule('每天 9 点提醒我开会');
      engine.disableRule(created.id);
      
      const enabled = engine.enableRule(created.id);
      expect(enabled).toBe(true);
      
      const rule = engine.getRule(created.id);
      expect(rule?.compiled.enabled).toBe(true);
    });
  });

  describe('disableRule', () => {
    it('should disable a rule', async () => {
      const created = await engine.createRule('每天 9 点提醒我开会');
      
      const disabled = engine.disableRule(created.id);
      expect(disabled).toBe(true);
      
      const rule = engine.getRule(created.id);
      expect(rule?.compiled.enabled).toBe(false);
    });
  });

  describe('createRuleEngine', () => {
    it('should create engine instance', () => {
      const instance = createRuleEngine(storage);
      expect(instance).toBeInstanceOf(RuleEngine);
    });
  });
});
