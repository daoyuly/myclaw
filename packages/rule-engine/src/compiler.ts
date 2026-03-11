/**
 * MyClaw Rule Compiler
 * Compiles rules into executable strategies
 */

import { EventEmitter } from 'events';
import { logger } from '@myclaw/logger';
import type { Rule } from '@myclaw/core';

/**
 * Compiled rule strategy
 */
export interface CompiledStrategy {
  ruleId: string;
  type: 'scheduled' | 'event-driven' | 'webhook' | 'manual';
  schedule?: string;
  eventPattern?: RegExp;
  webhookPath?: string;
  action: CompiledAction;
  priority: number;
  conditions: CompiledCondition[];
  metadata: Record<string, any>;
}

/**
 * Compiled action
 */
export interface CompiledAction {
  type: 'message' | 'command' | 'http' | 'script';
  template: string;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
}

/**
 * Compiled condition
 */
export interface CompiledCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches';
  value: any;
}

/**
 * Compilation result
 */
export interface CompilationResult {
  success: boolean;
  strategy?: CompiledStrategy;
  errors?: string[];
  warnings?: string[];
}

/**
 * Compiler options
 */
export interface CompilerOptions {
  optimize?: boolean;
  validateActions?: boolean;
  strictMode?: boolean;
}

/**
 * Rule Compiler
 *
 * Compiles rules into optimized executable strategies
 */
export class RuleCompiler extends EventEmitter {
  private options: Required<CompilerOptions>;

  constructor(options: CompilerOptions = {}) {
    super();

    this.options = {
      optimize: true,
      validateActions: true,
      strictMode: false,
      ...options,
    };

    logger.debug('RuleCompiler initialized', { options: this.options });
  }

  /**
   * Compile a single rule
   */
  compile(rule: Rule): CompilationResult {
    logger.info('Compiling rule', { ruleId: rule.id });

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate rule
      const validation = this.validateRule(rule);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Compile based on trigger type
      let strategy: CompiledStrategy;

      switch (rule.compiled.trigger) {
        case 'cron':
          strategy = this.compileCronRule(rule);
          break;
        case 'event':
          strategy = this.compileEventRule(rule);
          break;
        case 'webhook':
          strategy = this.compileWebhookRule(rule);
          break;
        case 'manual':
          strategy = this.compileManualRule(rule);
          break;
        default:
          return {
            success: false,
            errors: [`Unknown trigger type: ${(rule.compiled as any).trigger}`],
          };
      }

      // Optimize if enabled
      if (this.options.optimize) {
        this.optimizeStrategy(strategy);
      }

      // Validate actions if enabled
      if (this.options.validateActions) {
        const actionValidation = this.validateAction(strategy.action);
        if (!actionValidation.valid) {
          warnings.push(...actionValidation.warnings);
          if (this.options.strictMode) {
            errors.push(...actionValidation.warnings);
          }
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors,
          warnings,
        };
      }

      logger.info('Rule compiled successfully', { ruleId: rule.id });

      this.emit('compiled', { ruleId: rule.id, strategy });

      return {
        success: true,
        strategy,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      logger.error('Rule compilation failed', { ruleId: rule.id, error: error.message });

      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Compile multiple rules
   */
  compileAll(rules: Rule[]): Map<string, CompilationResult> {
    logger.info('Compiling multiple rules', { count: rules.length });

    const results = new Map<string, CompilationResult>();

    for (const rule of rules) {
      results.set(rule.id, this.compile(rule));
    }

    const successCount = Array.from(results.values()).filter((r) => r.success).length;

    logger.info('Batch compilation complete', {
      total: rules.length,
      success: successCount,
      failed: rules.length - successCount,
    });

    this.emit('batch-compiled', { results });

    return results;
  }

  // Private methods

  private validateRule(rule: Rule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!rule.id) {
      errors.push('Rule ID is required');
    }

    if (!rule.natural) {
      errors.push('Natural language description is required');
    }

    if (!rule.compiled.trigger) {
      errors.push('Trigger type is required');
    }

    // Validate trigger-specific fields
    if (rule.compiled.trigger === 'cron' && !rule.compiled.schedule) {
      errors.push('Cron schedule is required for cron trigger');
    }

    if (rule.compiled.trigger === 'event' && !(rule.compiled as any).event) {
      errors.push('Event pattern is required for event trigger');
    }

    if (rule.compiled.trigger === 'webhook' && !(rule.compiled as any).webhook) {
      errors.push('Webhook path is required for webhook trigger');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private compileCronRule(rule: Rule): CompiledStrategy {
    return {
      ruleId: rule.id,
      type: 'scheduled',
      schedule: rule.compiled.schedule!,
      action: this.compileAction(rule),
      priority: this.calculatePriority(rule),
      conditions: this.compileConditions(rule),
      metadata: {
        natural: rule.natural,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      },
    };
  }

  private compileEventRule(rule: Rule): CompiledStrategy {
    const eventPattern = (rule.compiled as any).event as string;

    return {
      ruleId: rule.id,
      type: 'event-driven',
      eventPattern: new RegExp(eventPattern.replace(/\*/g, '.*')),
      action: this.compileAction(rule),
      priority: this.calculatePriority(rule),
      conditions: this.compileConditions(rule),
      metadata: {
        natural: rule.natural,
        originalPattern: eventPattern,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      },
    };
  }

  private compileWebhookRule(rule: Rule): CompiledStrategy {
    return {
      ruleId: rule.id,
      type: 'webhook',
      webhookPath: (rule.compiled as any).webhook!,
      action: this.compileAction(rule),
      priority: this.calculatePriority(rule),
      conditions: this.compileConditions(rule),
      metadata: {
        natural: rule.natural,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      },
    };
  }

  private compileManualRule(rule: Rule): CompiledStrategy {
    return {
      ruleId: rule.id,
      type: 'manual',
      action: this.compileAction(rule),
      priority: this.calculatePriority(rule),
      conditions: this.compileConditions(rule),
      metadata: {
        natural: rule.natural,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      },
    };
  }

  private compileAction(rule: Rule): CompiledAction {
    const compiled = rule.compiled as any;

    return {
      type: compiled.action || 'message',
      template: compiled.message || compiled.command || 'Action triggered',
      params: compiled.params,
      timeout: compiled.timeout || 30000,
      retries: compiled.retries || 0,
    };
  }

  private compileConditions(rule: Rule): CompiledCondition[] {
    const conditions: CompiledCondition[] = [];
    const compiled = rule.compiled as any;

    if (compiled.conditions) {
      for (const [field, spec] of Object.entries(compiled.conditions)) {
        if (typeof spec === 'object' && spec !== null) {
          const cond = spec as any;
          conditions.push({
            field,
            operator: cond.operator || 'eq',
            value: cond.value,
          });
        } else {
          conditions.push({
            field,
            operator: 'eq',
            value: spec,
          });
        }
      }
    }

    return conditions;
  }

  private calculatePriority(rule: Rule): number {
    // Default priority based on trigger type
    const priorities: Record<string, number> = {
      cron: 10,
      event: 20,
      webhook: 30,
      manual: 40,
    };

    const basePriority = priorities[rule.compiled.trigger] || 50;

    // Adjust based on conditions (more conditions = higher priority)
    const conditionCount = Object.keys((rule.compiled as any).conditions || {}).length;

    return basePriority + conditionCount * 5;
  }

  private optimizeStrategy(strategy: CompiledStrategy): void {
    // Optimize event pattern
    if (strategy.eventPattern) {
      // Could optimize regex here
    }

    // Optimize conditions
    if (strategy.conditions.length > 0) {
      // Sort conditions by complexity
      strategy.conditions.sort((a, b) => {
        const complexityOrder = ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'contains', 'matches'];
        return complexityOrder.indexOf(a.operator) - complexityOrder.indexOf(b.operator);
      });
    }
  }

  private validateAction(action: CompiledAction): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check template
    if (!action.template || action.template.trim().length === 0) {
      warnings.push('Action template is empty');
    }

    // Check timeout
    if (action.timeout && action.timeout > 60000) {
      warnings.push('Action timeout exceeds 60 seconds');
    }

    // Check retries
    if (action.retries && action.retries > 5) {
      warnings.push('Action retries exceed 5, may cause delays');
    }

    // Type-specific validation
    if (action.type === 'http' && !action.params?.url) {
      warnings.push('HTTP action missing URL parameter');
    }

    if (action.type === 'script' && !action.params?.script) {
      warnings.push('Script action missing script content');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * Create a RuleCompiler instance
 */
export function createRuleCompiler(options?: CompilerOptions): RuleCompiler {
  return new RuleCompiler(options);
}
