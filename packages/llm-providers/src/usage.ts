import type { TokenUsage } from './types.js';
import { Logger } from '@myclaw/logger';

/**
 * Token 使用统计管理器
 */
export class UsageTracker {
  private usageHistory: TokenUsage[] = [];
  private logger = new Logger({ name: 'usage-tracker' });

  /**
   * 记录使用情况
   */
  record(usage: TokenUsage): void {
    this.usageHistory.push(usage);
    this.logger.debug('Usage recorded', {
      provider: usage.provider,
      model: usage.model,
      tokens: usage.totalTokens,
    });
  }

  /**
   * 获取使用历史
   */
  getHistory(limit?: number): TokenUsage[] {
    if (limit) {
      return this.usageHistory.slice(-limit);
    }
    return [...this.usageHistory];
  }

  /**
   * 按提供商统计
   */
  getByProvider(): Record<string, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requests: number;
  }> {
    const stats: Record<string, {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      requests: number;
    }> = {};

    for (const usage of this.usageHistory) {
      if (!stats[usage.provider]) {
        stats[usage.provider] = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requests: 0,
        };
      }

      stats[usage.provider].promptTokens += usage.promptTokens;
      stats[usage.provider].completionTokens += usage.completionTokens;
      stats[usage.provider].totalTokens += usage.totalTokens;
      stats[usage.provider].requests += 1;
    }

    return stats;
  }

  /**
   * 按模型统计
   */
  getByModel(): Record<string, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requests: number;
  }> {
    const stats: Record<string, {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      requests: number;
    }> = {};

    for (const usage of this.usageHistory) {
      const key = `${usage.provider}:${usage.model}`;
      if (!stats[key]) {
        stats[key] = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requests: 0,
        };
      }

      stats[key].promptTokens += usage.promptTokens;
      stats[key].completionTokens += usage.completionTokens;
      stats[key].totalTokens += usage.totalTokens;
      stats[key].requests += 1;
    }

    return stats;
  }

  /**
   * 获取总统计
   */
  getTotal(): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requests: number;
  } {
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    for (const usage of this.usageHistory) {
      promptTokens += usage.promptTokens;
      completionTokens += usage.completionTokens;
      totalTokens += usage.totalTokens;
    }

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      requests: this.usageHistory.length,
    };
  }

  /**
   * 按时间范围统计
   */
  getByTimeRange(startTime: number, endTime: number): TokenUsage[] {
    return this.usageHistory.filter(
      usage => usage.timestamp >= startTime && usage.timestamp <= endTime
    );
  }

  /**
   * 清空历史
   */
  clear(): void {
    this.usageHistory = [];
    this.logger.info('Usage history cleared');
  }
}
