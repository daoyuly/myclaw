import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SkillGenerator, createSkillGenerator, SkillFileSchema } from './index';

describe('SkillGenerator', () => {
  const testOutputDir = join(process.cwd(), '.test-skills');
  let generator: SkillGenerator;

  beforeEach(() => {
    // Create test output directory
    if (!existsSync(testOutputDir)) {
      mkdirSync(testOutputDir, { recursive: true });
    }

    generator = new SkillGenerator({
      outputDir: testOutputDir,
      format: 'yaml',
      validate: true,
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create instance with options', () => {
      expect(generator).toBeDefined();
    });

    it('should use default options', () => {
      const gen = new SkillGenerator({ outputDir: testOutputDir });
      expect(gen).toBeDefined();
    });
  });

  describe('generateFromRule', () => {
    it('should generate skill file from cron rule', async () => {
      const rule = {
        id: 'test-rule-123',
        natural: '每天早上9点提醒我开会',
        compiled: {
          trigger: 'cron' as const,
          schedule: '0 9 * * *',
          action: 'message',
          message: '开会时间到了',
        },
        enabled: true,
      };

      const result = await generator.generateFromRule(rule);

      expect(result.valid).toBe(true);
      expect(result.skillName).toBe('rule-test');
      expect(result.filePath).toContain('.skill.yaml');
      expect(existsSync(result.filePath)).toBe(true);

      // Verify file content
      const content = readFileSync(result.filePath, 'utf-8');
      expect(content).toContain('name: rule-test');
      expect(content).toContain('每天早上9点提醒我开会');
      expect(content).toContain('0 9 * * *');
      expect(content).toContain('开会时间到了');
    });

    it('should generate skill file from event rule', async () => {
      const rule = {
        id: 'event-rule-456',
        natural: '当收到邮件时提醒我',
        compiled: {
          trigger: 'event' as const,
          event: 'email.received',
          action: 'message',
          message: '收到新邮件',
        },
        enabled: true,
      };

      const result = await generator.generateFromRule(rule);

      expect(result.valid).toBe(true);
      expect(result.skillName).toBe('rule-event');

      const content = readFileSync(result.filePath, 'utf-8');
      expect(content).toContain('type: event');
      expect(content).toContain('email.received');
    });

    it('should generate skill file from webhook rule', async () => {
      const rule = {
        id: 'webhook-rule-789',
        natural: '通过 webhook 触发',
        compiled: {
          trigger: 'webhook' as const,
          webhook: '/api/trigger',
          action: 'command',
          command: 'npm run build',
        },
        enabled: true,
      };

      const result = await generator.generateFromRule(rule);

      expect(result.valid).toBe(true);

      const content = readFileSync(result.filePath, 'utf-8');
      expect(content).toContain('type: webhook');
      expect(content).toContain('/api/trigger');
      expect(content).toContain('npm run build');
    });

    it('should handle disabled rules', async () => {
      const rule = {
        id: 'disabled-rule',
        natural: '禁用的规则',
        compiled: {
          trigger: 'manual' as const,
          action: 'message',
          message: '测试',
        },
        enabled: false,
      };

      const result = await generator.generateFromRule(rule);

      const content = readFileSync(result.filePath, 'utf-8');
      expect(content).toContain('enabled: false');
    });

    it('should include metadata', async () => {
      const rule = {
        id: 'meta-rule',
        natural: '带元数据的规则',
        compiled: {
          trigger: 'cron' as const,
          schedule: '0 0 * * *',
          action: 'message',
          message: '午夜提醒',
        },
        enabled: true,
      };

      const result = await generator.generateFromRule(rule);

      const content = readFileSync(result.filePath, 'utf-8');
      expect(content).toContain('ruleId: meta-rule');
      expect(content).toContain('createdAt:');
    });
  });

  describe('generateFromRules', () => {
    it('should generate multiple skill files', async () => {
      const rules = [
        {
          id: 'rule-1',
          natural: '规则1',
          compiled: { trigger: 'cron' as const, schedule: '0 1 * * *', action: 'message', message: '消息1' },
          enabled: true,
        },
        {
          id: 'rule-2',
          natural: '规则2',
          compiled: { trigger: 'cron' as const, schedule: '0 2 * * *', action: 'message', message: '消息2' },
          enabled: true,
        },
        {
          id: 'rule-3',
          natural: '规则3',
          compiled: { trigger: 'event' as const, event: 'test.event', action: 'message', message: '消息3' },
          enabled: false,
        },
      ];

      const results = await generator.generateFromRules(rules);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.valid)).toBe(true);
      expect(results.every((r) => existsSync(r.filePath))).toBe(true);
    });

    it('should handle generation errors gracefully', async () => {
      const rules = [
        {
          id: 'good-rule',
          natural: '好规则',
          compiled: { trigger: 'cron' as const, schedule: '0 * * * *', action: 'message', message: '测试' },
          enabled: true,
        },
        {
          // Invalid rule - missing required fields
          id: '',
          natural: '',
          compiled: { trigger: 'cron' as const, action: 'message' },
          enabled: true,
        },
      ];

      const results = await generator.generateFromRules(rules);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      // Second result might fail validation but shouldn't throw
    });
  });

  describe('validate', () => {
    it('should validate a valid skill', () => {
      const skill = {
        name: 'test-skill',
        triggers: [{ type: 'cron', schedule: '0 * * * *' }],
        actions: [{ type: 'message', content: 'Test' }],
      };

      const result = generator.validate(skill);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect invalid skill', () => {
      const skill = {
        name: '',
        triggers: [],
        actions: [],
      };

      const result = generator.validate(skill);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should require trigger type', () => {
      const skill = {
        name: 'test',
        triggers: [{ type: 'invalid' }],
        actions: [{ type: 'message' }],
      };

      const result = generator.validate(skill);

      expect(result.valid).toBe(false);
    });
  });

  describe('SkillFileSchema', () => {
    it('should parse valid skill file', () => {
      const skill = {
        name: 'test-skill',
        version: '1.0.0',
        triggers: [{ type: 'cron', schedule: '0 * * * *' }],
        actions: [{ type: 'message', content: 'Hello' }],
        enabled: true,
      };

      const result = SkillFileSchema.safeParse(skill);

      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const skill = {
        name: 'test',
        triggers: [{ type: 'manual' }],
        actions: [{ type: 'message', content: 'Test' }],
      };

      const result = SkillFileSchema.parse(skill);

      expect(result.version).toBe('1.0.0');
      expect(result.enabled).toBe(true);
    });
  });

  describe('createSkillGenerator', () => {
    it('should create SkillGenerator instance', () => {
      const gen = createSkillGenerator({ outputDir: testOutputDir });
      expect(gen).toBeInstanceOf(SkillGenerator);
    });
  });
});
