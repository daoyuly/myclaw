import { BaseProvider } from '../provider.js';
import type {
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js';
import { ProviderError } from '../types.js';

/**
 * Ollama 本地提供商实现
 */
export class OllamaProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434/v1';
  }

  getProviderId(): 'ollama' {
    return 'ollama';
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/v1', '')}/api/tags`);
      if (!response.ok) {
        return [];
      }

      const data = await response.json() as {
        models: Array<{ name: string }>;
      };

      return data.models.map(m => m.name);
    } catch (error) {
      this.logger.error('Failed to fetch Ollama models', { error });
      return [];
    }
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Ollama 不需要 API Key
    return this.withRetry(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          'ollama',
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
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
        created: number;
      };

      const choice = data.choices[0];
      if (!choice) {
        throw new ProviderError('ollama', 'No response choices returned');
      }

      const result: ChatCompletionResponse = {
        id: data.id,
        provider: 'ollama',
        model: data.model,
        message: {
          role: choice.message.role as 'assistant',
          content: choice.message.content,
        },
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason as 'stop' | 'length',
        created: data.created || Date.now() / 1000,
      };

      this.recordUsage({
        provider: 'ollama',
        model: data.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        timestamp: Date.now(),
      });

      return result;
    }, 'chat');
  }
}
