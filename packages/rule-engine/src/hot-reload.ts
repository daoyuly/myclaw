/**
 * MyClaw Hot Reload Manager
 * Enables dynamic rule updates without restart
 */

import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'fs';
import { logger } from '@myclaw/logger';
import type { Rule } from '@myclaw/core';
import { RuleCompiler, CompiledStrategy } from './compiler';
import { Storage } from '@myclaw/storage';

/**
 * Hot reload event
 */
export interface HotReloadEvent {
  type: 'added' | 'updated' | 'removed' | 'reloaded';
  ruleId: string;
  rule?: Rule;
  strategy?: CompiledStrategy;
  timestamp: Date;
}

/**
 * Hot reload options
 */
export interface HotReloadOptions {
  watchFiles?: boolean;
  debounceMs?: number;
  maxRetries?: number;
}

/**
 * Hot reload status
 */
export interface HotReloadStatus {
  enabled: boolean;
  watching: boolean;
  rulesLoaded: number;
  lastReload?: Date;
  errors: string[];
}

/**
 * Hot Reload Manager
 *
 * Manages dynamic rule updates with hot reload support
 */
export class HotReloadManager extends EventEmitter {
  private storage: Storage;
  private compiler: RuleCompiler;
  private options: Required<HotReloadOptions>;
  private strategies: Map<string, CompiledStrategy> = new Map();
  private fileWatcher?: FSWatcher;
  private reloadTimers: Map<string, NodeJS.Timeout> = new Map();
  private enabled: boolean = false;
  private errors: string[] = [];

  constructor(
    storage: Storage,
    compiler: RuleCompiler,
    options: HotReloadOptions = {}
  ) {
    super();

    this.storage = storage;
    this.compiler = compiler;
    this.options = {
      watchFiles: false,
      debounceMs: 1000,
      maxRetries: 3,
      ...options,
    };

    logger.debug('HotReloadManager initialized', { options: this.options });
  }

  /**
   * Enable hot reload
   */
  async enable(): Promise<void> {
    if (this.enabled) {
      logger.warn('Hot reload already enabled');
      return;
    }

    logger.info('Enabling hot reload...');
    this.enabled = true;

    // Load all existing rules
    await this.loadAllRules();

    // Setup file watching if enabled
    if (this.options.watchFiles) {
      this.setupFileWatching();
    }

    // Listen to storage changes
    this.storage.on('rule-changed', this.handleRuleChanged.bind(this));
    this.storage.on('rule-added', this.handleRuleAdded.bind(this));
    this.storage.on('rule-removed', this.handleRuleRemoved.bind(this));

    logger.info('Hot reload enabled');
    this.emit('enabled');
  }

  /**
   * Disable hot reload
   */
  disable(): void {
    if (!this.enabled) {
      logger.warn('Hot reload already disabled');
      return;
    }

    logger.info('Disabling hot reload...');
    this.enabled = false;

    // Stop file watching
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }

    // Clear timers
    this.reloadTimers.forEach((timer) => clearTimeout(timer));
    this.reloadTimers.clear();

    // Remove storage listeners
    this.storage.removeAllListeners('rule-changed');
    this.storage.removeAllListeners('rule-added');
    this.storage.removeAllListeners('rule-removed');

    logger.info('Hot reload disabled');
    this.emit('disabled');
  }

  /**
   * Reload a specific rule
   */
  async reloadRule(ruleId: string): Promise<boolean> {
    if (!this.enabled) {
      logger.warn('Hot reload is disabled');
      return false;
    }

    logger.info('Reloading rule', { ruleId });

    try {
      // Get rule from storage
      const rule = this.storage.getRule(ruleId);
      if (!rule) {
        logger.warn('Rule not found', { ruleId });
        return false;
      }

      // Compile rule
      const result = this.compiler.compile(rule);

      if (!result.success || !result.strategy) {
        const error = result.errors?.join(', ') || 'Compilation failed';
        logger.error('Failed to compile rule', { ruleId, error });
        this.errors.push(`[${new Date().toISOString()}] Rule ${ruleId}: ${error}`);
        return false;
      }

      // Update strategy
      const previousStrategy = this.strategies.get(ruleId);
      this.strategies.set(ruleId, result.strategy);

      // Emit event
      const event: HotReloadEvent = {
        type: previousStrategy ? 'updated' : 'added',
        ruleId,
        rule,
        strategy: result.strategy,
        timestamp: new Date(),
      };

      this.emit('reloaded', event);
      logger.info('Rule reloaded successfully', { ruleId });

      return true;
    } catch (error: any) {
      logger.error('Failed to reload rule', { ruleId, error: error.message });
      this.errors.push(`[${new Date().toISOString()}] Rule ${ruleId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Reload all rules
   */
  async reloadAll(): Promise<void> {
    if (!this.enabled) {
      logger.warn('Hot reload is disabled');
      return;
    }

    logger.info('Reloading all rules...');

    const rules = this.storage.getAllRules();
    const results = await Promise.all(
      rules.map((rule) => this.reloadRule(rule.id))
    );

    const successCount = results.filter((r) => r).length;

    logger.info('Batch reload complete', {
      total: rules.length,
      success: successCount,
      failed: rules.length - successCount,
    });

    this.emit('batch-reloaded', {
      total: rules.length,
      success: successCount,
    });
  }

  /**
   * Get compiled strategy
   */
  getStrategy(ruleId: string): CompiledStrategy | undefined {
    return this.strategies.get(ruleId);
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): Map<string, CompiledStrategy> {
    return new Map(this.strategies);
  }

  /**
   * Get hot reload status
   */
  getStatus(): HotReloadStatus {
    return {
      enabled: this.enabled,
      watching: this.fileWatcher !== undefined,
      rulesLoaded: this.strategies.size,
      lastReload: this.strategies.size > 0 ? new Date() : undefined,
      errors: this.errors.slice(-10), // Keep last 10 errors
    };
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  // Private methods

  private async loadAllRules(): Promise<void> {
    logger.info('Loading all rules...');

    const rules = this.storage.getAllRules();
    const results = this.compiler.compileAll(rules);

    let loaded = 0;
    results.forEach((result, ruleId) => {
      if (result.success && result.strategy) {
        this.strategies.set(ruleId, result.strategy);
        loaded++;
      } else {
        const error = result.errors?.join(', ') || 'Unknown error';
        this.errors.push(`[${new Date().toISOString()}] Rule ${ruleId}: ${error}`);
      }
    });

    logger.info('Rules loaded', { total: rules.length, loaded });
  }

  private setupFileWatching(): void {
    // This would watch rule files if they were stored as files
    // For now, rules are in SQLite, so we use storage events
    logger.debug('File watching setup (using storage events)');
  }

  private handleRuleChanged(rule: Rule): void {
    if (!this.enabled) return;

    logger.debug('Rule changed', { ruleId: rule.id });

    // Debounce reload
    this.debouncedReload(rule.id);
  }

  private handleRuleAdded(rule: Rule): void {
    if (!this.enabled) return;

    logger.debug('Rule added', { ruleId: rule.id });
    this.debouncedReload(rule.id);
  }

  private handleRuleRemoved(ruleId: string): void {
    if (!this.enabled) return;

    logger.debug('Rule removed', { ruleId });

    // Remove strategy
    this.strategies.delete(ruleId);

    // Clear any pending reload
    const timer = this.reloadTimers.get(ruleId);
    if (timer) {
      clearTimeout(timer);
      this.reloadTimers.delete(ruleId);
    }

    this.emit('removed', { ruleId, timestamp: new Date() });
  }

  private debouncedReload(ruleId: string): void {
    // Clear existing timer
    const existingTimer = this.reloadTimers.get(ruleId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.reloadTimers.delete(ruleId);
      this.reloadRule(ruleId);
    }, this.options.debounceMs);

    this.reloadTimers.set(ruleId, timer);
  }
}

/**
 * Create a HotReloadManager instance
 */
export function createHotReloadManager(
  storage: Storage,
  compiler: RuleCompiler,
  options?: HotReloadOptions
): HotReloadManager {
  return new HotReloadManager(storage, compiler, options);
}
