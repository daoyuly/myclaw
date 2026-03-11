import type { LLMProviderId, ProviderConfig, RoutingStrategy } from './types.js';
import { BaseProvider } from './provider.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/gemini.js';
import { ZhipuProvider } from './providers/zhipu.js';
import { MoonshotProvider } from './providers/moonshot.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { OllamaProvider } from './providers/ollama.js';
import { Logger } from '@myclaw/logger';

/**
 * 提供商路由器
 * 负责管理和路由多个 LLM 提供商
 */
export class ProviderRouter {
  private providers: Map<LLMProviderId, BaseProvider> = new Map();
  private logger = new Logger({ name: 'provider-router' });
  private roundRobinIndex = 0;

  constructor(configs: ProviderConfig[]) {
    this.initializeProviders(configs);
  }

  /**
   * 初始化提供商
   */
  private initializeProviders(configs: ProviderConfig[]): void {
    for (const config of configs) {
      const provider = this.createProvider(config);
      this.providers.set(config.id, provider);
      this.logger.info(`Provider initialized: ${config.id}`);
    }
  }

  /**
   * 创建提供商实例
   */
  private createProvider(config: ProviderConfig): BaseProvider {
    switch (config.id) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'zhipu':
        return new ZhipuProvider(config);
      case 'moonshot':
        return new MoonshotProvider(config);
      case 'deepseek':
        return new DeepSeekProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      default:
        throw new Error(`Unknown provider: ${config.id}`);
    }
  }

  /**
   * 获取提供商
   */
  getProvider(id: LLMProviderId): BaseProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * 获取所有提供商
   */
  getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 获取可用的提供商
   */
  async getAvailableProviders(): Promise<BaseProvider[]> {
    const available: BaseProvider[] = [];
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }

  /**
   * 根据策略选择提供商
   */
  async selectProvider(
    strategy: RoutingStrategy = 'priority',
    preferredProvider?: LLMProviderId
  ): Promise<BaseProvider> {
    // 如果指定了首选提供商，优先使用
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }

    const available = await this.getAvailableProviders();
    if (available.length === 0) {
      throw new Error('No available providers');
    }

    switch (strategy) {
      case 'priority':
        // 按优先级排序，选择最高优先级的
        return available.sort((a, b) => {
          const priorityA = a.getConfig().priority || 5;
          const priorityB = b.getConfig().priority || 5;
          return priorityA - priorityB;
        })[0];

      case 'round-robin':
        // 轮询
        this.roundRobinIndex = (this.roundRobinIndex + 1) % available.length;
        return available[this.roundRobinIndex];

      case 'least-latency':
        // TODO: 实现延迟检测
        return available[0];

      case 'cost-optimized':
        // TODO: 实现成本优化
        return available[0];

      default:
        return available[0];
    }
  }

  /**
   * 添加提供商
   */
  addProvider(config: ProviderConfig): void {
    const provider = this.createProvider(config);
    this.providers.set(config.id, provider);
    this.logger.info(`Provider added: ${config.id}`);
  }

  /**
   * 移除提供商
   */
  async removeProvider(id: LLMProviderId): Promise<void> {
    const provider = this.providers.get(id);
    if (provider) {
      await provider.cleanup();
      this.providers.delete(id);
      this.logger.info(`Provider removed: ${id}`);
    }
  }

  /**
   * 清理所有提供商
   */
  async cleanup(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.cleanup();
    }
    this.providers.clear();
    this.logger.info('All providers cleaned up');
  }
}
