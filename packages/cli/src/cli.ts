#!/usr/bin/env node

import { Command } from 'commander';
import { createRuleEngine } from '@myclaw/rule-engine';
import { Storage } from '@myclaw/storage';
import { logger } from '@myclaw/logger';
import chalk from 'chalk';
import inquirer from 'inquirer';

const program = new Command();

// Initialize storage
const storage = new Storage('~/.myclaw/myclaw.db');
const ruleEngine = createRuleEngine(storage);

program
  .name('myclaw')
  .description('MyClaw - Easy OpenClaw Management')
  .version('0.1.0');

// Rule commands
program
  .command('rule')
  .description('Manage rules')
  .argument('[action]', 'Action: list, add, enable, disable, delete')
  .argument('[id]', 'Rule ID (for enable/disable/delete)')
  .action(async (action, id) => {
    try {
      switch (action) {
        case 'list':
          const rules = ruleEngine.getAllRules();
          console.log(chalk.blue('\n📋 Rules:\n'));
          rules.forEach(rule => {
            const status = rule.compiled.enabled ? chalk.green('✓') : chalk.red('✗');
            console.log(`${status} ${rule.id} - ${rule.natural}`);
            console.log(`  Trigger: ${rule.compiled.trigger}`);
            if (rule.compiled.schedule) {
              console.log(`  Schedule: ${rule.compiled.schedule}`);
            }
            console.log();
          });
          break;

        case 'add':
          const { natural } = await inquirer.prompt([
            {
              type: 'input',
              name: 'natural',
              message: 'Enter rule in natural language:',
              validate: (input) => input.length > 0,
            },
          ]);

          const rule = await ruleEngine.createRule(natural);
          console.log(chalk.green(`\n✅ Rule created: ${rule.id}`));
          console.log(chalk.gray(`  ${rule.natural}`));
          break;

        case 'enable':
          if (!id) {
            console.log(chalk.red('Error: Rule ID required'));
            return;
          }
          if (ruleEngine.enableRule(id)) {
            console.log(chalk.green(`\n✅ Rule enabled: ${id}`));
          } else {
            console.log(chalk.red(`\n❌ Rule not found: ${id}`));
          }
          break;

        case 'disable':
          if (!id) {
            console.log(chalk.red('Error: Rule ID required'));
            return;
          }
          if (ruleEngine.disableRule(id)) {
            console.log(chalk.yellow(`\n⏸️  Rule disabled: ${id}`));
          } else {
            console.log(chalk.red(`\n❌ Rule not found: ${id}`));
          }
          break;

        case 'delete':
          if (!id) {
            console.log(chalk.red('Error: Rule ID required'));
            return;
          }
          if (ruleEngine.deleteRule(id)) {
            console.log(chalk.red(`\n🗑️  Rule deleted: ${id}`));
          } else {
            console.log(chalk.red(`\n❌ Rule not found: ${id}`));
          }
          break;

        default:
          console.log(chalk.yellow('Usage: myclaw rule [list|add|enable|disable|delete] [id]'));
      }
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      logger.error('CLI error', { error: error.message });
    }
  });

// Parse command only when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
