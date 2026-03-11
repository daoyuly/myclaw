import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RuleEngine, createRuleEngine, type RuleEvent, type RuleEventListener } from '../src/index';
import { Storage } from '@myclaw/storage';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('RuleEngine Events', () => {
  let engine: RuleEngine;
  let storage: Storage;
  let testDbPath: string;

  beforeEach(() => {
    // Use unique timestamp for each test to avoid conflicts
    testDbPath = path.join(os.tmpdir(), `myclaw-rule-events-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    storage = new Storage(testDbPath);
    engine = createRuleEngine(storage);
  });

  afterEach(() => {
    engine.removeAllRuleEventListeners();
    try {
      storage.close();
    } catch (error) {
      // Ignore close errors
    }
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('onRuleEvent', () => {
    it('should emit created event when rule is created', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('created', listener);

      const rule = await engine.createRule('每天 9 点提醒我开会');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        type: 'created',
        rule,
        timestamp: expect.any(Date),
      } as RuleEvent);
    });

    it('should emit updated event when rule is updated', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('updated', listener);

      const created = await engine.createRule('每天 9 点提醒我开会');
      const updated = engine.updateRule(created.id, {
        natural: '每天 10 点提醒我开会',
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        type: 'updated',
        rule: updated,
        timestamp: expect.any(Date),
      } as RuleEvent);
    });

    it('should emit deleted event when rule is deleted', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('deleted', listener);

      const created = await engine.createRule('每天 9 点提醒我开会');
      engine.deleteRule(created.id);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        type: 'deleted',
        rule: created,
        timestamp: expect.any(Date),
      } as RuleEvent);
    });

    it('should emit enabled event when rule is enabled', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('enabled', listener);

      const created = await engine.createRule('每天 9 点提醒我开会');
      engine.disableRule(created.id);
      engine.enableRule(created.id);

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as RuleEvent;
      expect(event.type).toBe('enabled');
      expect(event.rule.compiled.enabled).toBe(true);
    });

    it('should emit disabled event when rule is disabled', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('disabled', listener);

      const created = await engine.createRule('每天 9 点提醒我开会');
      engine.disableRule(created.id);

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as RuleEvent;
      expect(event.type).toBe('disabled');
      expect(event.rule.compiled.enabled).toBe(false);
    });

    it('should subscribe to all events with "*"', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('*', listener);

      const rule1 = await engine.createRule('每天 9 点提醒我开会');
      const rule2 = await engine.createRule('每天 10 点提醒我休息');
      engine.updateRule(rule1.id, { natural: '每天 11 点提醒我开会' });
      engine.disableRule(rule2.id);
      engine.enableRule(rule2.id);
      engine.deleteRule(rule1.id);

      expect(listener).toHaveBeenCalledTimes(6);
    });

    it('should not emit event when update fails', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('updated', listener);

      engine.updateRule('non-existent-id', { natural: 'updated' });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not emit event when delete fails', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('deleted', listener);

      engine.deleteRule('non-existent-id');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('offRuleEvent', () => {
    it('should unsubscribe from specific event', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('created', listener);
      engine.offRuleEvent('created', listener);

      await engine.createRule('每天 9 点提醒我开会');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should unsubscribe from all events with "*"', async () => {
      const listener = vi.fn();
      engine.onRuleEvent('*', listener);
      engine.offRuleEvent('*', listener);

      await engine.createRule('每天 9 点提醒我开会');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('onceRuleEvent', () => {
    it('should subscribe to event once', async () => {
      const listener = vi.fn();
      engine.onceRuleEvent('created', listener);

      await engine.createRule('每天 9 点提醒我开会');
      await engine.createRule('每天 10 点提醒我休息');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllRuleEventListeners', () => {
    it('should remove all event listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      engine.onRuleEvent('created', listener1);
      engine.onRuleEvent('updated', listener2);
      engine.removeAllRuleEventListeners();

      await engine.createRule('每天 9 点提醒我开会');

      expect(listener1).not.toHaveBeenCalled();
    });
  });

  describe('EventEmitter inheritance', () => {
    it('should be an EventEmitter', () => {
      expect(engine.on).toBeDefined();
      expect(engine.off).toBeDefined();
      expect(engine.emit).toBeDefined();
      expect(engine.once).toBeDefined();
    });

    it('should support standard EventEmitter methods', async () => {
      const listener = vi.fn();
      engine.on('created', listener);

      const rule = await engine.createRule('每天 9 点提醒我开会');

      expect(listener).toHaveBeenCalledWith({
        type: 'created',
        rule,
        timestamp: expect.any(Date),
      });
    });
  });
});
