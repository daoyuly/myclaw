import { BaseProvider } from '../provider.js';
import type {
  ProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../types.js';
import { ProviderError } from '../types.js';

/**
 * Google Gemini 提供商实现
 */
export class GeminiProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  getProviderId(): 'gemini' {
    return 'gemini';
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ];
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateApiKey();

    return this.withRetry(async () => {
      const url = `${this.baseUrl}/models/${request.model}:generateContent?key=${this.config.apiKey}`;

      // 转换消息格式为 Gemini 格式
      const contents = request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxTokens,
            topP: request.topP,
            stopSequences: request.stop,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ProviderError(
          'gemini',
          `Chat completion failed: ${error}`,
          undefined,
          response.status
        );
      }

      const data = await response.json() as {
        candidates: Array<{
          content: {
            parts: Array<{ text: string }>;
            role: string;
          };
          finishReason: string;
        }>;
        usageMetadata: {
          promptTokenCount: number;
          candidatesTokenCount: number;
          totalTokenCount: number;
        };
      };

      const candidate = data.candidates[0];
      if (!candidate) {
        throw new ProviderError('gemini', 'No response candidates returned');
      }

      const textContent = candidate.content.parts
        .map(p => p.text)
        .join('');

      const result: ChatCompletionResponse = {
        id: `gemini-${Date.now()}`,
        provider: 'gemini',
        model: request.model,
        message: {
          role: 'assistant',
          content: textContent,
        },
        usage: {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        },
        finishReason: candidate.finishReason.toLowerCase() as 'stop' | 'length',
        created: Date.now() / 1000,
      };

      this.recordUsage({
        provider: 'gemini',
        model: request.model,
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
        timestamp: Date.now(),
      });

      return result;
    }, 'chat');
  }
}
