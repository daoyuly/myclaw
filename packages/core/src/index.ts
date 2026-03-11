/**
 * MyClaw Core Types
 * Core type definitions and Zod schemas for MyClaw
 */

import { z } from 'zod';

// ============================================================================
// Rule System Types
// ============================================================================

export const RuleSchema = z.object({
  id: z.string().uuid(),
  natural: z.string().min(1),
  compiled: z.object({
    trigger: z.enum(['cron', 'event', 'webhook', 'manual']),
    schedule: z.string().optional(),
    action: z.string(),
    message: z.string().optional(),
    enabled: z.boolean().default(true),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Rule = z.infer<typeof RuleSchema>;

// ============================================================================
// Channel Configuration
// ============================================================================

export const ChannelTypeSchema = z.enum([
  'telegram',
  'discord',
  'whatsapp',
  'signal',
  'feishu',
  'slack',
  'google-chat',
]);

export type ChannelType = z.infer<typeof ChannelTypeSchema>;

export const ChannelConfigSchema = z.object({
  id: z.string().uuid(),
  type: ChannelTypeSchema,
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ChannelConfig = z.infer<typeof ChannelConfigSchema>;

// ============================================================================
// LLM Provider Types
// ============================================================================

export const LLMProviderSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'zhipu',
  'moonshot',
  'deepseek',
  'ollama',
  'groq',
]);

export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const ModelConfigSchema = z.object({
  id: z.string().uuid(),
  provider: LLMProviderSchema,
  model: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// ============================================================================
// Permission Types
// ============================================================================

export const PermissionConfigSchema = z.object({
  id: z.string().uuid(),
  allowRead: z.array(z.string()),
  allowWrite: z.array(z.string()),
  deny: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PermissionConfig = z.infer<typeof PermissionConfigSchema>;

// ============================================================================
// Gateway Types
// ============================================================================

export const GatewayStatusSchema = z.enum(['starting', 'running', 'stopping', 'stopped', 'error']);

export type GatewayStatus = z.infer<typeof GatewayStatusSchema>;

export const GatewayStateSchema = z.object({
  status: GatewayStatusSchema,
  pid: z.number().optional(),
  startedAt: z.date().optional(),
  lastHealthCheck: z.date().optional(),
  restartCount: z.number().default(0),
  errorMessage: z.string().optional(),
});

export type GatewayState = z.infer<typeof GatewayStateSchema>;

// ============================================================================
// Export all schemas
// ============================================================================

export const Schemas = {
  Rule: RuleSchema,
  ChannelConfig: ChannelConfigSchema,
  ModelConfig: ModelConfigSchema,
  PermissionConfig: PermissionConfigSchema,
  GatewayState: GatewayStateSchema,
} as const;

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const Err = <E = Error>(error: E): Result<never, E> => ({ ok: false, error });
