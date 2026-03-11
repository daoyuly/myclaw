import { z } from 'zod';

/**
 * LLM 提供商标识
 */
export const LLMProviderId = z.enum([
  'openai',
  'anthropic',
  'gemini',
  'zhipu',
  'moonshot',
  'deepseek',
  'ollama',
]);
export type LLMProviderId = z.infer<typeof LLMProviderId>;

/**
 * 聊天消息角色
 */
export const MessageRole = z.enum(['system', 'user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRole>;

/**
 * 聊天消息
 */
export const ChatMessage = z.object({
  role: MessageRole,
  content: z.string(),
  name: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

/**
 * 聊天完成请求
 */
export const ChatCompletionRequest = z.object({
  messages: z.array(ChatMessage),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  stop: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
});
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequest>;

/**
 * 聊天完成响应
 */
export const ChatCompletionResponse = z.object({
  id: z.string(),
  provider: LLMProviderId,
  model: z.string(),
  message: ChatMessage,
  usage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
  }),
  finishReason: z.enum(['stop', 'length', 'content_filter', 'null']).nullable(),
  created: z.number(),
});
export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponse>;

/**
 * 提供商配置
 */
export const ProviderConfig = z.object({
  id: LLMProviderId,
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(10).default(5),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  models: z.array(z.string()).optional(),
  defaultModel: z.string().optional(),
  maxRetries: z.number().int().min(0).max(5).default(3),
  timeout: z.number().int().positive().default(30000),
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

/**
 * 提供商状态
 */
export const ProviderStatus = z.object({
  id: LLMProviderId,
  enabled: z.boolean(),
  available: z.boolean(),
  lastCheck: z.number().optional(),
  error: z.string().optional(),
  models: z.array(z.string()),
});
export type ProviderStatus = z.infer<typeof ProviderStatus>;

/**
 * Token 使用统计
 */
export const TokenUsage = z.object({
  provider: LLMProviderId,
  model: z.string(),
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  timestamp: z.number(),
  requestId: z.string().optional(),
});
export type TokenUsage = z.infer<typeof TokenUsage>;

/**
 * 路由策略
 */
export const RoutingStrategy = z.enum([
  'priority', // 按优先级选择
  'round-robin', // 轮询
  'least-latency', // 最低延迟
  'cost-optimized', // 成本优化
]);
export type RoutingStrategy = z.infer<typeof RoutingStrategy>;

/**
 * 提供商错误
 */
export class ProviderError extends Error {
  constructor(
    public provider: LLMProviderId,
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
  }
}
