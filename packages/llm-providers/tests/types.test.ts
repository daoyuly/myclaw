import { describe, it, expect } from 'vitest';
import {
  LLMProviderId,
  MessageRole,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderConfig,
  RoutingStrategy,
} from '../src/types.js';

describe('Types & Schemas', () => {
  describe('LLMProviderId', () => {
    it('should validate supported providers', () => {
      expect(LLMProviderId.parse('openai')).toBe('openai');
      expect(LLMProviderId.parse('anthropic')).toBe('anthropic');
      expect(LLMProviderId.parse('gemini')).toBe('gemini');
      expect(LLMProviderId.parse('zhipu')).toBe('zhipu');
      expect(LLMProviderId.parse('moonshot')).toBe('moonshot');
      expect(LLMProviderId.parse('deepseek')).toBe('deepseek');
      expect(LLMProviderId.parse('ollama')).toBe('ollama');
    });

    it('should reject invalid providers', () => {
      expect(() => LLMProviderId.parse('invalid')).toThrow();
    });
  });

  describe('MessageRole', () => {
    it('should validate message roles', () => {
      expect(MessageRole.parse('system')).toBe('system');
      expect(MessageRole.parse('user')).toBe('user');
      expect(MessageRole.parse('assistant')).toBe('assistant');
    });

    it('should reject invalid roles', () => {
      expect(() => MessageRole.parse('invalid')).toThrow();
    });
  });

  describe('ChatMessage', () => {
    it('should validate chat message', () => {
      const message = ChatMessage.parse({
        role: 'user',
        content: 'Hello!',
      });
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello!');
    });

    it('should allow optional name', () => {
      const message = ChatMessage.parse({
        role: 'user',
        content: 'Hello!',
        name: 'Alice',
      });
      expect(message.name).toBe('Alice');
    });
  });

  describe('ChatCompletionRequest', () => {
    it('should validate request with required fields', () => {
      const request = ChatCompletionRequest.parse({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'gpt-4',
      });
      expect(request.messages).toHaveLength(1);
      expect(request.model).toBe('gpt-4');
    });

    it('should allow optional parameters', () => {
      const request = ChatCompletionRequest.parse({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
      });
      expect(request.temperature).toBe(0.7);
      expect(request.maxTokens).toBe(1000);
      expect(request.topP).toBe(0.9);
    });
  });

  describe('ProviderConfig', () => {
    it('should validate provider config', () => {
      const config = ProviderConfig.parse({
        id: 'openai',
        apiKey: 'test-key',
      });
      expect(config.id).toBe('openai');
      expect(config.enabled).toBe(true);
      expect(config.priority).toBe(5);
    });

    it('should use default values', () => {
      const config = ProviderConfig.parse({
        id: 'anthropic',
      });
      expect(config.enabled).toBe(true);
      expect(config.priority).toBe(5);
      expect(config.maxRetries).toBe(3);
      expect(config.timeout).toBe(30000);
    });
  });

  describe('RoutingStrategy', () => {
    it('should validate routing strategies', () => {
      expect(RoutingStrategy.parse('priority')).toBe('priority');
      expect(RoutingStrategy.parse('round-robin')).toBe('round-robin');
      expect(RoutingStrategy.parse('least-latency')).toBe('least-latency');
      expect(RoutingStrategy.parse('cost-optimized')).toBe('cost-optimized');
    });
  });
});
