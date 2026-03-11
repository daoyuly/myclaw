import { describe, it, expect, vi } from 'vitest';
import { BaseProvider } from '../src/provider.js';
import type { ProviderConfig, ChatCompletionRequest, ChatCompletionResponse } from '../src/types.js';
import { ProviderError } from '../src/types.js';

// 创建一个测试用的 Provider 实现
class TestProvider extends BaseProvider {
  getProviderId() {
    return 'openai' as const;
  }

  async getAvailableModels(): Promise<string[]> {
    return ['test-model-1', 'test-model-2'];
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateApiKey();
    const response = {
      id: 'test-id',
      provider: 'openai',
      model: request.model,
      message: { role: 'assistant', content: 'Test response' },
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
      created: Date.now() / 1000,
    };
    
    // 记录使用情况
    this.recordUsage({
      provider: 'openai',
      model: request.model,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      totalTokens: response.usage.totalTokens,
      timestamp: Date.now(),
    });
    
    return response;
  }
}

describe('BaseProvider', () => {
  const config: ProviderConfig = {
    id: 'openai',
    apiKey: 'test-key',
    enabled: true,
    priority: 5,
    maxRetries: 3,
    timeout: 30000,
  };

  describe('constructor', () => {
    it('should create provider with config', () => {
      const provider = new TestProvider(config);
      expect(provider.getConfig()).toEqual(config);
    });
  });

  describe('isAvailable', () => {
    it('should return true when models are available', async () => {
      const provider = new TestProvider(config);
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when error occurs', async () => {
      class FailingProvider extends TestProvider {
        async getAvailableModels() {
          throw new Error('Failed');
        }
      }
      const provider = new FailingProvider(config);
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return provider status', async () => {
      const provider = new TestProvider(config);
      const status = await provider.getStatus();
      expect(status.id).toBe('openai');
      expect(status.enabled).toBe(true);
      expect(status.available).toBe(true);
      expect(status.models).toHaveLength(2);
    });
  });

  describe('updateConfig', () => {
    it('should update config', () => {
      const provider = new TestProvider(config);
      provider.updateConfig({ priority: 10 });
      expect(provider.getConfig().priority).toBe(10);
    });

    it('should emit config-updated event', () => {
      const provider = new TestProvider(config);
      const handler = vi.fn();
      provider.on('config-updated', handler);
      provider.updateConfig({ priority: 10 });
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('recordUsage', () => {
    it('should record token usage', async () => {
      const provider = new TestProvider(config);
      await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'test-model',
      });

      const history = provider.getUsageHistory();
      expect(history).toHaveLength(1);
      expect(history[0].provider).toBe('openai');
      expect(history[0].totalTokens).toBe(30);
    });

    it('should emit usage event', async () => {
      const provider = new TestProvider(config);
      const handler = vi.fn();
      provider.on('usage', handler);

      await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'test-model',
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('should throw error when API key is missing', async () => {
      const provider = new TestProvider({ ...config, apiKey: undefined });
      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'test-model',
      })).rejects.toThrow(ProviderError);
    });
  });

  describe('withRetry', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      class RetryProvider extends TestProvider {
        async chat() {
          return this.withRetry(async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error('Temporary failure');
            }
            return {
              id: 'test-id',
              provider: 'openai',
              model: 'test-model',
              message: { role: 'assistant', content: 'Success' },
              usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
              finishReason: 'stop',
              created: Date.now() / 1000,
            };
          }, 'chat');
        }
      }

      // 使用较低的重试次数配置来减少测试时间
      const provider = new RetryProvider({ ...config, maxRetries: 3 });
      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'test-model',
      });

      expect(attempts).toBe(3);
      expect(result.message.content).toBe('Success');
    }, 10000); // 增加超时到 10 秒

    it('should throw after max retries', async () => {
      class FailingProvider extends TestProvider {
        async chat() {
          return this.withRetry(async () => {
            throw new Error('Permanent failure');
          }, 'chat');
        }
      }

      const provider = new FailingProvider({ ...config, maxRetries: 2 });
      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'test-model',
      })).rejects.toThrow(ProviderError);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', async () => {
      const provider = new TestProvider(config);
      await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'test-model',
      });

      expect(provider.getUsageHistory()).toHaveLength(1);
      await provider.cleanup();
      expect(provider.getUsageHistory()).toHaveLength(0);
    });
  });
});
