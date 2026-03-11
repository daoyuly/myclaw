import { describe, it, expect } from 'vitest';
import { Schemas, Ok, Err } from '../src/index';

describe('Core Types', () => {
  describe('Rule Schema', () => {
    it('should validate a valid rule', () => {
      const rule = {
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
      };

      const result = Schemas.Rule.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it('should reject invalid trigger type', () => {
      const rule = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: 'test',
        compiled: {
          trigger: 'invalid',
          action: 'test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.Rule.safeParse(rule);
      expect(result.success).toBe(false);
    });

    it('should reject empty natural language', () => {
      const rule = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: '',
        compiled: {
          trigger: 'manual' as const,
          action: 'test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.Rule.safeParse(rule);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const rule = {
        id: 'not-a-uuid',
        natural: 'test rule',
        compiled: {
          trigger: 'manual' as const,
          action: 'test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.Rule.safeParse(rule);
      expect(result.success).toBe(false);
    });

    it('should set enabled default to true', () => {
      const rule = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        natural: 'test rule',
        compiled: {
          trigger: 'manual' as const,
          action: 'test',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.Rule.safeParse(rule);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.compiled.enabled).toBe(true);
      }
    });

    it('should support all trigger types', () => {
      const triggers = ['cron', 'event', 'webhook', 'manual'] as const;

      triggers.forEach((trigger) => {
        const rule = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          natural: `test ${trigger}`,
          compiled: {
            trigger,
            action: 'test',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = Schemas.Rule.safeParse(rule);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Channel Config Schema', () => {
    it('should validate a valid channel config', () => {
      const channel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'telegram' as const,
        name: 'My Telegram Bot',
        enabled: true,
        config: { token: '123456:ABC-DEF' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ChannelConfig.safeParse(channel);
      expect(result.success).toBe(true);
    });

    it('should support all channel types', () => {
      const types = ['telegram', 'discord', 'whatsapp', 'signal', 'feishu', 'slack', 'google-chat'] as const;

      types.forEach((type) => {
        const channel = {
          id: '550e8400-e29b-41d4-a716-446655440001',
          type,
          name: `Test ${type}`,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = Schemas.ChannelConfig.safeParse(channel);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid channel type', () => {
      const channel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'invalid',
        name: 'Test',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ChannelConfig.safeParse(channel);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const channel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'telegram' as const,
        name: '',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ChannelConfig.safeParse(channel);
      expect(result.success).toBe(false);
    });

    it('should set enabled default to true', () => {
      const channel = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'telegram' as const,
        name: 'Test',
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ChannelConfig.safeParse(channel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
      }
    });
  });

  describe('Model Config Schema', () => {
    it('should validate a valid model config', () => {
      const model = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        provider: 'openai' as const,
        model: 'gpt-4',
        apiKey: 'sk-test',
        enabled: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ModelConfig.safeParse(model);
      expect(result.success).toBe(true);
    });

    it('should support all LLM providers', () => {
      const providers = ['openai', 'anthropic', 'google', 'zhipu', 'moonshot', 'deepseek', 'ollama', 'groq'] as const;

      providers.forEach((provider) => {
        const model = {
          id: '550e8400-e29b-41d4-a716-446655440002',
          provider,
          model: 'test-model',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = Schemas.ModelConfig.safeParse(model);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid provider', () => {
      const model = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        provider: 'invalid',
        model: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ModelConfig.safeParse(model);
      expect(result.success).toBe(false);
    });

    it('should reject invalid baseUrl', () => {
      const model = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        provider: 'openai' as const,
        model: 'gpt-4',
        baseUrl: 'not-a-url',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ModelConfig.safeParse(model);
      expect(result.success).toBe(false);
    });

    it('should allow optional apiKey and baseUrl', () => {
      const model = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        provider: 'ollama' as const,
        model: 'llama2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.ModelConfig.safeParse(model);
      expect(result.success).toBe(true);
    });
  });

  describe('Permission Config Schema', () => {
    it('should validate a valid permission config', () => {
      const permission = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        allowRead: ['/path1', '/path2'],
        allowWrite: ['/path1'],
        deny: ['/path3'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.PermissionConfig.safeParse(permission);
      expect(result.success).toBe(true);
    });

    it('should allow empty arrays', () => {
      const permission = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        allowRead: [],
        allowWrite: [],
        deny: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = Schemas.PermissionConfig.safeParse(permission);
      expect(result.success).toBe(true);
    });
  });

  describe('Gateway State Schema', () => {
    it('should validate a valid gateway state', () => {
      const state = {
        status: 'running' as const,
        pid: 12345,
        startedAt: new Date(),
        lastHealthCheck: new Date(),
        restartCount: 0,
      };

      const result = Schemas.GatewayState.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should support all status types', () => {
      const statuses = ['starting', 'running', 'stopping', 'stopped', 'error'] as const;

      statuses.forEach((status) => {
        const state = {
          status,
          restartCount: 0,
        };

        const result = Schemas.GatewayState.safeParse(state);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const state = {
        status: 'invalid',
        restartCount: 0,
      };

      const result = Schemas.GatewayState.safeParse(state);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const state = {
        status: 'stopped' as const,
        restartCount: 0,
      };

      const result = Schemas.GatewayState.safeParse(state);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pid).toBeUndefined();
        expect(result.data.startedAt).toBeUndefined();
      }
    });

    it('should set restartCount default to 0', () => {
      const state = {
        status: 'stopped' as const,
      };

      const result = Schemas.GatewayState.safeParse(state);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.restartCount).toBe(0);
      }
    });
  });

  describe('Result Type', () => {
    it('should create Ok result', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should create Err result', () => {
      const result = Err(new Error('test error'));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('test error');
      }
    });

    it('should work with complex types', () => {
      const data = { name: 'test', value: [1, 2, 3] };
      const result = Ok(data);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('test');
        expect(result.value.value).toEqual([1, 2, 3]);
      }
    });

    it('should work with custom error types', () => {
      const customError = { code: 'ERR001', message: 'Custom error' };
      const result = Err(customError);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('ERR001');
      }
    });
  });
});
