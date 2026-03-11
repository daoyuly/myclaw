import { describe, it, expect, beforeEach } from 'vitest';
import { UsageTracker } from '../src/usage.js';
import type { TokenUsage } from '../src/types.js';

describe('UsageTracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker();
  });

  describe('record', () => {
    it('should record token usage', () => {
      const usage: TokenUsage = {
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        timestamp: Date.now(),
      };

      tracker.record(usage);
      const history = tracker.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(usage);
    });

    it('should record multiple usages', () => {
      for (let i = 0; i < 5; i++) {
        tracker.record({
          provider: 'openai',
          model: 'gpt-4',
          promptTokens: 10,
          completionTokens: 10,
          totalTokens: 20,
          timestamp: Date.now(),
        });
      }

      expect(tracker.getHistory()).toHaveLength(5);
    });
  });

  describe('getHistory', () => {
    it('should return limited history', () => {
      for (let i = 0; i < 10; i++) {
        tracker.record({
          provider: 'openai',
          model: 'gpt-4',
          promptTokens: i,
          completionTokens: i,
          totalTokens: i * 2,
          timestamp: Date.now(),
        });
      }

      const history = tracker.getHistory(3);
      expect(history).toHaveLength(3);
      expect(history[0].promptTokens).toBe(7);
      expect(history[1].promptTokens).toBe(8);
      expect(history[2].promptTokens).toBe(9);
    });
  });

  describe('getByProvider', () => {
    it('should aggregate usage by provider', () => {
      tracker.record({
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        timestamp: Date.now(),
      });

      tracker.record({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        promptTokens: 50,
        completionTokens: 30,
        totalTokens: 80,
        timestamp: Date.now(),
      });

      tracker.record({
        provider: 'anthropic',
        model: 'claude-3',
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        timestamp: Date.now(),
      });

      const stats = tracker.getByProvider();

      expect(stats['openai']).toEqual({
        promptTokens: 150,
        completionTokens: 80,
        totalTokens: 230,
        requests: 2,
      });

      expect(stats['anthropic']).toEqual({
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        requests: 1,
      });
    });
  });

  describe('getByModel', () => {
    it('should aggregate usage by model', () => {
      tracker.record({
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        timestamp: Date.now(),
      });

      tracker.record({
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 50,
        completionTokens: 30,
        totalTokens: 80,
        timestamp: Date.now(),
      });

      const stats = tracker.getByModel();

      expect(stats['openai:gpt-4']).toEqual({
        promptTokens: 150,
        completionTokens: 80,
        totalTokens: 230,
        requests: 2,
      });
    });
  });

  describe('getTotal', () => {
    it('should return total statistics', () => {
      tracker.record({
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        timestamp: Date.now(),
      });

      tracker.record({
        provider: 'anthropic',
        model: 'claude-3',
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        timestamp: Date.now(),
      });

      const total = tracker.getTotal();

      expect(total).toEqual({
        promptTokens: 300,
        completionTokens: 150,
        totalTokens: 450,
        requests: 2,
      });
    });
  });

  describe('getByTimeRange', () => {
    it('should filter by time range', () => {
      const now = Date.now();

      tracker.record({
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        timestamp: now - 2000,
      });

      tracker.record({
        provider: 'anthropic',
        model: 'claude-3',
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        timestamp: now - 1000,
      });

      tracker.record({
        provider: 'ollama',
        model: 'llama2',
        promptTokens: 50,
        completionTokens: 25,
        totalTokens: 75,
        timestamp: now,
      });

      const range = tracker.getByTimeRange(now - 1500, now + 100);
      expect(range).toHaveLength(2);
      expect(range[0].provider).toBe('anthropic');
      expect(range[1].provider).toBe('ollama');
    });
  });

  describe('clear', () => {
    it('should clear history', () => {
      tracker.record({
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        timestamp: Date.now(),
      });

      expect(tracker.getHistory()).toHaveLength(1);

      tracker.clear();

      expect(tracker.getHistory()).toHaveLength(0);
    });
  });
});
