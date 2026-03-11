import { EventEmitter } from 'events';
import type {
  LLMProviderId,
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderStatus,
  TokenUsage,
} from './types.js';
import { ProviderError } from './types.js';
import { Logger } from '@myclaw/logger';

/**
 * Provider 抽象基类
 * 所有 LLM 提供商实现都需要继承此类
 */
export abstract class BaseProvider extends EventEmitter {
  protected config: ProviderConfig;
  protected logger: Logger;
  protected usageHistory: TokenUsage[] = [];

  constructor(config: ProviderConfig) {
    super();
    this.config = config;
    this.logger = new Logger({ name: `provider:${this.getProviderId()}` });
  }

  /**
   * 获取提供商标识
   */
  abstract getProviderId(): LLMProviderId;

  /**
   * 获取可用模型列表
   */
  abstract getAvailableModels(): Promise<string[]>;

  /**
   * 执行聊天完成请求
   */
  abstract chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * 检查提供商是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.length > 0;
    } catch (error) {
      this.logger.error('Availability check failed', { error });
      return false;
    }
  }

  /**
   * 获取提供商状态
   */
  async getStatus(): Promise<ProviderStatus> {
    const available = await this.isAvailable();
    const models = available ? await this.getAvailableModels() : [];

    return {
      id: this.getProviderId(),
      enabled: this.config.enabled,
      available,
      models,
      lastCheck: Date.now(),
    };
  }

  /**
   * 获取配置
   */
  getConfig(): ProviderConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config-updated', this.config);
  }

  /**
   * 记录 Token 使用
   */
  protected recordUsage(usage: TokenUsage): void {
    this.usageHistory.push(usage);
    this.emit('usage', usage);
    this.logger.debug('Token usage recorded', {
      provider: usage.provider,
      model: usage.model,
      tokens: usage.totalTokens,
    });
  }

  /**
   * 获取使用历史
   */
  getUsageHistory(): TokenUsage[] {
    return [...this.usageHistory];
  }

  /**
   * 重试逻辑
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const maxRetries = this.config.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`${operationName} attempt ${attempt}/${maxRetries} failed`, {
          error: lastError.message,
        });

        if (attempt < maxRetries) {
          // 指数退避
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new ProviderError(
      this.getProviderId(),
      `${operationName} failed after ${maxRetries} retries: ${lastError?.message}`
    );
  }

  /**
   * 验证 API Key
   */
  protected validateApiKey(): void {
    if (!this.config.apiKey) {
      throw new ProviderError(this.getProviderId(), 'API key is required');
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.usageHistory = [];
    this.logger.info('Provider cleaned up');
  }
}
