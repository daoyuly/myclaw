import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderRouter } from '../src/router.js';
import type { ProviderConfig } from '../src/types.js';

describe('ProviderRouter', () => {
  let router: ProviderRouter;
  const configs: ProviderConfig[] = [
    { id: 'openai', apiKey: 'test-key-1', priority: 1 },
    { id: 'anthropic', apiKey: 'test-key-2', priority: 2 },
    { id: 'ollama', priority: 3 },
  ];

  beforeEach(() => {
    router = new ProviderRouter(configs);
    
    // 模拟所有提供商的 isAvailable 方法，避免真实的 HTTP 请求
    router.getAllProviders().forEach(provider => {
      vi.spyOn(provider, 'isAvailable').mockResolvedValue(true);
    });
  });

  describe('constructor', () => {
    it('should initialize providers', () => {
      const providers = router.getAllProviders();
      expect(providers).toHaveLength(3);
    });
  });

  describe('getProvider', () => {
    it('should return provider by id', () => {
      const provider = router.getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider?.getProviderId()).toBe('openai');
    });

    it('should return undefined for unknown provider', () => {
      const provider = router.getProvider('unknown' as any);
      expect(provider).toBeUndefined();
    });
  });

  describe('getAllProviders', () => {
    it('should return all providers', () => {
      const providers = router.getAllProviders();
      expect(providers).toHaveLength(3);
      const ids = providers.map(p => p.getProviderId());
      expect(ids).toContain('openai');
      expect(ids).toContain('anthropic');
      expect(ids).toContain('ollama');
    });
  });

  describe('selectProvider', () => {
    it('should select provider by priority', async () => {
      const provider = await router.selectProvider('priority');
      expect(provider.getProviderId()).toBe('openai');
    });

    it('should select preferred provider if available', async () => {
      const provider = await router.selectProvider('priority', 'anthropic');
      expect(provider.getProviderId()).toBe('anthropic');
    });

    it('should fallback to available providers if preferred not available', async () => {
      const provider = await router.selectProvider('priority', 'unknown' as any);
      expect(provider.getProviderId()).toBe('openai');
    });

    it('should throw error when no providers available', async () => {
      const emptyRouter = new ProviderRouter([]);
      await expect(emptyRouter.selectProvider()).rejects.toThrow('No available providers');
    });
  });

  describe('addProvider', () => {
    it('should add new provider', () => {
      router.addProvider({ id: 'gemini', apiKey: 'test-key' });
      const providers = router.getAllProviders();
      expect(providers).toHaveLength(4);
      expect(router.getProvider('gemini')).toBeDefined();
    });
  });

  describe('removeProvider', () => {
    it('should remove provider', async () => {
      await router.removeProvider('openai');
      const providers = router.getAllProviders();
      expect(providers).toHaveLength(2);
      expect(router.getProvider('openai')).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all providers', async () => {
      await router.cleanup();
      const providers = router.getAllProviders();
      expect(providers).toHaveLength(0);
    });
  });
});
