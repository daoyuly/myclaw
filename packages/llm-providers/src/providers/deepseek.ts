import { BaseProvider } from '../provider.js';
import type {
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js';
import { ProviderError } from '../types.js';

/**
 * DeepSeek 提供商实现
 */
export class DeepSeekProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
  }

  getProviderId(): 'deepseek' {
    return 'deepseek';
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'deepseek-chat',
      'deepseek-coder',
    ];
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
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          'deepseek',
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
        throw new ProviderError('deepseek', 'No response choices returned');
      }

      const result: ChatCompletionResponse = {
        id: data.id,
        provider: 'deepseek',
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

      this.recordUsage({
        provider: 'deepseek',
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
