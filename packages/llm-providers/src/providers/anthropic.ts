import { BaseProvider } from '../provider.js';
import type {
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js';
import { ProviderError } from '../types.js';

/**
 * Anthropic (Claude) 提供商实现
 */
export class AnthropicProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  getProviderId(): 'anthropic' {
    return 'anthropic';
  }

  async getAvailableModels(): Promise<string[]> {
    // Anthropic 没有列出模型的 API，返回已知模型
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateApiKey();

    return this.withRetry(async () => {
      // Anthropic API 格式与 OpenAI 不同
      const systemMessage = request.messages.find(m => m.role === 'system');
      const conversationMessages = request.messages.filter(m => m.role !== 'system');

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey!,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: request.model,
          messages: conversationMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          system: systemMessage?.content,
          max_tokens: request.maxTokens || 4096,
          temperature: request.temperature,
          top_p: request.topP,
          stop_sequences: request.stop,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          'anthropic',
          `Chat completion failed: ${error}`,
          undefined,
          response.status
        );
      }

      const data = await response.json() as {
        id: string;
        model: string;
        content: Array<{ type: string; text: string }>;
        stop_reason: string;
        usage: {
          input_tokens: number;
          output_tokens: number;
        };
      };

      const textContent = data.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');

      const result: ChatCompletionResponse = {
        id: data.id,
        provider: 'anthropic',
        model: data.model,
        message: {
          role: 'assistant',
          content: textContent,
        },
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
        created: Date.now() / 1000,
      };

      // 记录使用情况
      this.recordUsage({
        provider: 'anthropic',
        model: data.model,
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        timestamp: Date.now(),
      });

      return result;
    }, 'chat');
  }
}
