// Types
export * from './types.js';

// Base Provider
export { BaseProvider } from './provider.js';

// Providers
export { OpenAIProvider } from './providers/openai.js';
export { AnthropicProvider } from './providers/anthropic.js';
export { GeminiProvider } from './providers/gemini.js';
export { ZhipuProvider } from './providers/zhipu.js';
export { MoonshotProvider } from './providers/moonshot.js';
export { DeepSeekProvider } from './providers/deepseek.js';
export { OllamaProvider } from './providers/ollama.js';

// Router
export { ProviderRouter } from './router.js';

// Usage Tracker
export { UsageTracker } from './usage.js';

// Helper function to create provider
import type { ProviderConfig, LLMProviderId } from './types.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/gemini.js';
import { ZhipuProvider } from './providers/zhipu.js';
import { MoonshotProvider } from './providers/moonshot.js';
import { DeepSeekProvider } from './providers/deepseek.js';
import { OllamaProvider } from './providers/ollama.js';
import { BaseProvider } from './provider.js';

/**
 * 创建提供商实例
 */
export function createProvider(config: ProviderConfig): BaseProvider {
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
