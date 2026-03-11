import { BaseProvider } from '../provider.js';
import type {
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js';
import { ProviderError } from '../types.js';

/**
 * OpenAI 提供商实现
 */
export class OpenAIProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  getProviderId(): 'openai' {
    return 'openai';
  }

  async getAvailableModels(): Promise<string[]> {
    if (!this.config.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new ProviderError('openai', `Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json() as { data: Array<{ id: string }> };
      return data.data
        .map(model => model.id)
        .filter(id => id.startsWith('gpt-'));
    } catch (error) {
      this.logger.error('Failed to fetch OpenAI models', { error });
      // 返回默认模型列表
      return [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4-turbo-preview',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
      ];
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateApiKey();

    return this.withRetry(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          top_p: request.topP,
          stop: request.stop,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          'openai',
          `Chat completion failed: ${error}`,
          undefined,
          response.status
        );
      }

      const data = await response.json() as {
        id: string;
        model: string;
        choices: Array<{
          message: { role: string; content: string };
          finish_reason: string;
        }>;
        usage: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
        created: number;
      };

      const choice = data.choices[0];
      if (!choice) {
        throw new ProviderError('openai', 'No response choices returned');
      }

      const result: ChatCompletionResponse = {
        id: data.id,
        provider: 'openai',
        model: data.model,
        message: {
          role: choice.message.role as 'assistant',
          content: choice.message.content,
        },
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: choice.finish_reason as 'stop' | 'length',
        created: data.created,
      };

      // 记录使用情况
      this.recordUsage({
        provider: 'openai',
        model: data.model,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        timestamp: Date.now(),
      });

      return result;
    }, 'chat');
  }
}
