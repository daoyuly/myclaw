import { Schemas, type Rule } from '@myclaw/core';
import { logger } from '@myclaw/logger';
import { Storage } from '@myclaw/storage';
import { EventEmitter } from 'events';

// Re-export compiler
export { RuleCompiler, createRuleCompiler } from './compiler';
export type {
  CompiledStrategy,
  CompiledAction,
  CompiledCondition,
  CompilationResult,
  CompilerOptions,
} from './compiler';

/**
 * Rule event types
 */
export type RuleEventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'enabled'
  | 'disabled';

/**
 * Rule event payload
 */
export interface RuleEvent {
  type: RuleEventType;
  rule: Rule;
  timestamp: Date;
}

/**
 * Rule event listener
 */
export type RuleEventListener = (event: RuleEvent) => void;

/**
 * Parsed rule components
 */
export interface ParsedRule {
  trigger: 'cron' | 'event' | 'webhook' | 'manual';
  schedule?: string;
  action: string;
  message?: string;
  conditions?: Record<string, any>;
}

/**
 * Rule parsing result
 */
export interface ParseResult {
  success: boolean;
  rule?: ParsedRule;
  error?: string;
}

/**
 * Rule Engine
 * 
 * Parses natural language rules and converts them to executable rules
 * Supports hot reload through event emitters
 */
export class RuleEngine extends EventEmitter {
  private storage: Storage;

  constructor(storage: Storage) {
    super();
    this.storage = storage;
    logger.debug('RuleEngine initialized');
  }

  /**
   * Parse natural language rule
   */
  parse(natural: string): ParseResult {
    logger.debug('Parsing rule', { natural });

    try {
      // Simple pattern matching for common patterns
      const parsed = this.matchPatterns(natural);
      
      if (parsed) {
        logger.info('Rule parsed successfully', { natural, parsed });
        return {
          success: true,
          rule: parsed,
        };
      }

      return {
        success: false,
        error: 'Unable to parse rule. Please use a supported pattern.',
      };
    } catch (error: any) {
      logger.error('Failed to parse rule', { natural, error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a new rule from natural language
   */
  async createRule(natural: string): Promise<Rule> {
    logger.info('Creating rule from natural language', { natural });

    // Parse the natural language
    const parseResult = this.parse(natural);

    if (!parseResult.success || !parseResult.rule) {
      throw new Error(parseResult.error || 'Failed to parse rule');
    }

    // Create rule object
    const rule = Schemas.Rule.parse({
      id: crypto.randomUUID(),
      natural,
      compiled: {
        ...parseResult.rule,
        enabled: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save to storage
    this.storage.saveRule(rule);

    logger.info('Rule created', { id: rule.id, natural });

    // Emit created event
    this.emit('created', {
      type: 'created',
      rule,
      timestamp: new Date(),
    } as RuleEvent);

    return rule;
  }

  /**
   * Get a rule by ID
   */
  getRule(id: string): Rule | null {
    return this.storage.getRule(id);
  }

  /**
   * Get all rules
   */
  getAllRules(): Rule[] {
    return this.storage.getAllRules();
  }

  /**
   * Update a rule
   */
  updateRule(id: string, updates: Partial<Rule>): Rule | null {
    const existing = this.storage.getRule(id);
    if (!existing) {
      return null;
    }

    // If natural language is updated, re-parse
    if (updates.natural && updates.natural !== existing.natural) {
      const parseResult = this.parse(updates.natural);
      if (parseResult.success && parseResult.rule) {
        updates.compiled = {
          ...parseResult.rule,
          enabled: existing.compiled.enabled,
        };
      }
    }

    const updated = Schemas.Rule.parse({
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });

    this.storage.saveRule(updated);
    logger.info('Rule updated', { id });

    // Emit updated event
    this.emit('updated', {
      type: 'updated',
      rule: updated,
      timestamp: new Date(),
    } as RuleEvent);

    return updated;
  }

  /**
   * Delete a rule
   */
  deleteRule(id: string): boolean {
    const existing = this.storage.getRule(id);
    if (!existing) {
      return false;
    }

    this.storage.deleteRule(id);
    logger.info('Rule deleted', { id });

    // Emit deleted event
    this.emit('deleted', {
      type: 'deleted',
      rule: existing,
      timestamp: new Date(),
    } as RuleEvent);

    return true;
  }

  /**
   * Enable a rule
   */
  enableRule(id: string): boolean {
    const existing = this.storage.getRule(id);
    if (!existing) {
      return false;
    }

    const updated = Schemas.Rule.parse({
      ...existing,
      compiled: {
        ...existing.compiled,
        enabled: true,
      },
      updatedAt: new Date(),
    });

    this.storage.saveRule(updated);
    logger.info('Rule enabled', { id });

    // Emit enabled event
    this.emit('enabled', {
      type: 'enabled',
      rule: updated,
      timestamp: new Date(),
    } as RuleEvent);

    return true;
  }

  /**
   * Disable a rule
   */
  disableRule(id: string): boolean {
    const existing = this.storage.getRule(id);
    if (!existing) {
      return false;
    }

    const updated = Schemas.Rule.parse({
      ...existing,
      compiled: {
        ...existing.compiled,
        enabled: false,
      },
      updatedAt: new Date(),
    });

    this.storage.saveRule(updated);
    logger.info('Rule disabled', { id });

    // Emit disabled event
    this.emit('disabled', {
      type: 'disabled',
      rule: updated,
      timestamp: new Date(),
    } as RuleEvent);

    return true;
  }

  /**
   * Match natural language patterns
   */
  private matchPatterns(natural: string): ParsedRule | null {
    const lower = natural.toLowerCase();

    // Pattern: "每天 [时间] [动作]"
    const dailyMatch = lower.match(/每天(.{1,10})(提醒|通知|发送|执行)/);
    if (dailyMatch) {
      const timeStr = dailyMatch[1].trim();
      const action = dailyMatch[2];
      const schedule = this.parseTime(timeStr);

      return {
        trigger: 'cron',
        schedule,
        action: this.parseAction(action),
        message: this.extractMessage(natural),
      };
    }

    // Pattern: "每小时 [动作]"
    const hourlyMatch = lower.match(/每小时(提醒|通知|发送|执行)/);
    if (hourlyMatch) {
      const action = hourlyMatch[1];

      return {
        trigger: 'cron',
        schedule: '0 * * * *',
        action: this.parseAction(action),
        message: this.extractMessage(natural),
      };
    }

    // Pattern: "每周 [星期] [时间] [动作]"
    const weeklyMatch = lower.match(/每周(.{1,10})(.{1,10})(提醒|通知|发送|执行)/);
    if (weeklyMatch) {
      const dayStr = weeklyMatch[1].trim();
      const timeStr = weeklyMatch[2].trim();
      const action = weeklyMatch[3];
      const schedule = this.parseWeeklyTime(dayStr, timeStr);

      return {
        trigger: 'cron',
        schedule,
        action: this.parseAction(action),
        message: this.extractMessage(natural),
      };
    }

    // Pattern: "当 [事件] 时 [动作]"
    const eventMatch = lower.match(/当(.{1,50})时(提醒|通知|发送|执行)/);
    if (eventMatch) {
      const event = eventMatch[1].trim();
      const action = eventMatch[2];

      return {
        trigger: 'event',
        conditions: { event },
        action: this.parseAction(action),
        message: this.extractMessage(natural),
      };
    }

    return null;
  }

  /**
   * Parse time string to cron expression
   */
  private parseTime(timeStr: string): string {
    // Pattern: "早上 9 点" -> "0 9 * * *"
    const morningMatch = timeStr.match(/早上\s*(\d{1,2})\s*点/);
    if (morningMatch) {
      const hour = morningMatch[1];
      return `0 ${hour} * * *`;
    }

    // Pattern: "下午 3 点" -> "0 15 * * *"
    const afternoonMatch = timeStr.match(/下午\s*(\d{1,2})\s*点/);
    if (afternoonMatch) {
      const hour = parseInt(afternoonMatch[1]) + 12;
      return `0 ${hour} * * *`;
    }

    // Pattern: "9 点" -> "0 9 * * *"
    const simpleMatch = timeStr.match(/(\d{1,2})\s*点/);
    if (simpleMatch) {
      const hour = simpleMatch[1];
      return `0 ${hour} * * *`;
    }

    // Default: every hour
    return '0 * * * *';
  }

  /**
   * Parse weekly time string to cron expression
   */
  private parseWeeklyTime(dayStr: string, timeStr: string): string {
    const dayMap: Record<string, number> = {
      '日': 0,
      '一': 1,
      '二': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
    };

    // Extract day of week
    let dayOfWeek = '*';
    for (const [day, num] of Object.entries(dayMap)) {
      if (dayStr.includes(day)) {
        dayOfWeek = num.toString();
        break;
      }
    }

    // Extract time
    const hourMatch = timeStr.match(/(\d{1,2})\s*点/);
    const hour = hourMatch ? hourMatch[1] : '9';

    return `0 ${hour} * * ${dayOfWeek}`;
  }

  /**
   * Parse action type
   */
  private parseAction(action: string): string {
    const actionMap: Record<string, string> = {
      '提醒': 'notify',
      '通知': 'notify',
      '发送': 'send',
      '执行': 'execute',
    };

    return actionMap[action] || 'notify';
  }

  /**
   * Extract message from natural language
   */
  private extractMessage(natural: string): string {
    // Try to extract quoted message
    const quotedMatch = natural.match(/["'](.+?)["']/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // Try to extract message after "说" or "内容是"
    const sayMatch = natural.match(/(?:说|内容是)\s*(.+)/);
    if (sayMatch) {
      return sayMatch[1].trim();
    }

    // Return the original text as message
    return natural;
  }

  /**
   * Subscribe to rule events
   * 
   * @param event - Event type ('created', 'updated', 'deleted', 'enabled', 'disabled')
   * @param listener - Event listener function
   */
  onRuleEvent(event: RuleEventType | '*', listener: RuleEventListener): this {
    if (event === '*') {
      // Subscribe to all events
      this.on('created', listener);
      this.on('updated', listener);
      this.on('deleted', listener);
      this.on('enabled', listener);
      this.on('disabled', listener);
    } else {
      this.on(event, listener);
    }
    return this;
  }

  /**
   * Unsubscribe from rule events
   * 
   * @param event - Event type
   * @param listener - Event listener function
   */
  offRuleEvent(event: RuleEventType | '*', listener: RuleEventListener): this {
    if (event === '*') {
      this.off('created', listener);
      this.off('updated', listener);
      this.off('deleted', listener);
      this.off('enabled', listener);
      this.off('disabled', listener);
    } else {
      this.off(event, listener);
    }
    return this;
  }

  /**
   * Subscribe to rule events (one-time)
   * 
   * @param event - Event type
   * @param listener - Event listener function
   */
  onceRuleEvent(event: RuleEventType, listener: RuleEventListener): this {
    this.once(event, listener);
    return this;
  }

  /**
   * Remove all event listeners
   */
  removeAllRuleEventListeners(): this {
    this.removeAllListeners();
    return this;
  }
}

/**
 * Create rule engine instance
 */
export function createRuleEngine(storage: Storage): RuleEngine {
  return new RuleEngine(storage);
}
