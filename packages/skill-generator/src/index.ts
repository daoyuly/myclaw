/**
 * MyClaw Skill File Generator
 * Converts rules to OpenClaw skill files (YAML)
 */

import { stringify } from 'yaml';
import { z } from 'zod';
import { logger } from '@myclaw/logger';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * Skill file schema
 */
export const SkillFileSchema = z.object({
  name: z.string().min(1),
  version: z.string().default('1.0.0'),
  description: z.string().optional(),
  triggers: z.array(z.object({
    type: z.enum(['cron', 'event', 'webhook', 'manual']),
    schedule: z.string().optional(),
    event: z.string().optional(),
    webhook: z.string().optional(),
  })),
  actions: z.array(z.object({
    type: z.enum(['message', 'command', 'http', 'script']),
    content: z.string().optional(),
    command: z.string().optional(),
    url: z.string().optional(),
    method: z.string().optional(),
    script: z.string().optional(),
    params: z.record(z.any()).optional(),
  })),
  enabled: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

export type SkillFile = z.infer<typeof SkillFileSchema>;

/**
 * Skill generator options
 */
export interface SkillGeneratorOptions {
  outputDir: string;
  format?: 'yaml' | 'json';
  validate?: boolean;
}

/**
 * Generation result
 */
export interface GenerationResult {
  skillName: string;
  filePath: string;
  content: string;
  valid: boolean;
  errors?: string[];
}

/**
 * Skill Generator
 *
 * Generates OpenClaw skill files from rules
 */
export class SkillGenerator {
  private options: Required<SkillGeneratorOptions>;

  constructor(options: SkillGeneratorOptions) {
    this.options = {
      format: 'yaml',
      validate: true,
      ...options,
    };

    logger.debug('SkillGenerator initialized', { options: this.options });
  }

  /**
   * Generate skill file from rule
   */
  async generateFromRule(rule: {
    id: string;
    natural: string;
    compiled: {
      trigger: 'cron' | 'event' | 'webhook' | 'manual';
      schedule?: string;
      event?: string;
      webhook?: string;
      action: string;
      message?: string;
      command?: string;
      params?: Record<string, any>;
    };
    enabled: boolean;
  }): Promise<GenerationResult> {
    logger.info('Generating skill file', { ruleId: rule.id });

    try {
      // Convert rule to skill format
      const skill: SkillFile = {
        name: this.generateSkillName(rule.id),
        description: rule.natural,
        version: '1.0.0',
        triggers: [{
          type: rule.compiled.trigger,
          schedule: rule.compiled.schedule,
          event: rule.compiled.event,
          webhook: rule.compiled.webhook,
        }],
        actions: this.generateActions(rule.compiled),
        enabled: rule.enabled,
        metadata: {
          ruleId: rule.id,
          createdAt: new Date().toISOString(),
        },
      };

      // Validate if enabled
      let valid = true;
      let errors: string[] | undefined;

      if (this.options.validate) {
        const result = SkillFileSchema.safeParse(skill);
        valid = result.success;

        if (!result.success) {
          errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
          logger.warn('Skill validation failed', { errors });
        }
      }

      // Generate file content
      const content = this.serialize(skill);

      // Write to file
      const filePath = join(this.options.outputDir, `${skill.name}.skill.yaml`);
      await this.writeFile(filePath, content);

      logger.info('Skill file generated', { skillName: skill.name, filePath });

      return {
        skillName: skill.name,
        filePath,
        content,
        valid,
        errors,
      };
    } catch (error: any) {
      logger.error('Failed to generate skill file', { ruleId: rule.id, error: error.message });
      throw error;
    }
  }

  /**
   * Generate multiple skill files
   */
  async generateFromRules(rules: Array<any>): Promise<GenerationResult[]> {
    logger.info('Generating skill files', { count: rules.length });

    const results: GenerationResult[] = [];

    for (const rule of rules) {
      try {
        const result = await this.generateFromRule(rule);
        results.push(result);
      } catch (error: any) {
        logger.error('Failed to generate skill for rule', { ruleId: rule.id, error: error.message });
        results.push({
          skillName: this.generateSkillName(rule.id),
          filePath: '',
          content: '',
          valid: false,
          errors: [error.message],
        });
      }
    }

    return results;
  }

  /**
   * Validate a skill file
   */
  validate(skill: unknown): { valid: boolean; errors?: string[] } {
    const result = SkillFileSchema.safeParse(skill);

    if (result.success) {
      return { valid: true };
    } else {
      return {
        valid: false,
        errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      };
    }
  }

  /**
   * Parse skill file content
   */
  parse(content: string): SkillFile {
    const parsed = this.options.format === 'yaml'
      ? require('yaml').parse(content)
      : JSON.parse(content);

    return SkillFileSchema.parse(parsed);
  }

  // Private methods

  private generateSkillName(ruleId: string): string {
    // Use last 8 chars of rule ID
    const shortId = ruleId.split('-')[0] || ruleId.slice(0, 8);
    return `rule-${shortId}`;
  }

  private generateActions(compiled: any): SkillFile['actions'] {
    const actions: SkillFile['actions'] = [];

    if (compiled.action === 'message' && compiled.message) {
      actions.push({
        type: 'message',
        content: compiled.message,
        params: compiled.params,
      });
    } else if (compiled.action === 'command' && compiled.command) {
      actions.push({
        type: 'command',
        command: compiled.command,
        params: compiled.params,
      });
    } else {
      // Default action
      actions.push({
        type: 'message',
        content: compiled.message || 'Action triggered',
        params: compiled.params,
      });
    }

    return actions;
  }

  private serialize(skill: SkillFile): string {
    if (this.options.format === 'yaml') {
      return stringify(skill, {
        lineWidth: 0, // Don't wrap lines
        defaultStringType: 'PLAIN',
        defaultKeyType: 'PLAIN',
      });
    } else {
      return JSON.stringify(skill, null, 2);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(filePath, content, 'utf-8');
    logger.debug('Skill file written', { filePath });
  }
}

/**
 * Create a SkillGenerator instance
 */
export function createSkillGenerator(options: SkillGeneratorOptions): SkillGenerator {
  return new SkillGenerator(options);
}
