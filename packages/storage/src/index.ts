/**
 * MyClaw Storage
 * SQLite-based persistence layer
 */

import Database from 'better-sqlite3';
import { logger } from '@myclaw/logger';
import type { Rule, ChannelConfig, ModelConfig, PermissionConfig } from '@myclaw/core';
import { Schemas } from '@myclaw/core';
import path from 'path';
import fs from 'fs';

export class Storage {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string = path.join(process.env.HOME!, '.myclaw', 'myclaw.db')) {
    this.dbPath = dbPath;
    this.ensureDirectory();
    this.db = new Database(dbPath);
    this.initialize();
    logger.info('Storage initialized', { path: dbPath });
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info('Created storage directory', { dir });
    }
  }

  private initialize(): void {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY,
        natural TEXT NOT NULL,
        compiled TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        config TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        apiKey TEXT,
        baseUrl TEXT,
        enabled INTEGER DEFAULT 1,
        isDefault INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        allowRead TEXT NOT NULL,
        allowWrite TEXT NOT NULL,
        deny TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rules_createdAt ON rules(createdAt);
      CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
      CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);
    `);
  }

  // Rules
  saveRule(rule: Rule): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO rules (id, natural, compiled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      rule.id,
      rule.natural,
      JSON.stringify(rule.compiled),
      rule.createdAt.toISOString(),
      rule.updatedAt.toISOString()
    );

    logger.debug('Rule saved', { id: rule.id });
  }

  getRule(id: string): Rule | null {
    const stmt = this.db.prepare('SELECT * FROM rules WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return Schemas.Rule.parse({
      ...row,
      compiled: JSON.parse(row.compiled),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  getAllRules(): Rule[] {
    const stmt = this.db.prepare('SELECT * FROM rules ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];

    return rows.map((row) =>
      Schemas.Rule.parse({
        ...row,
        compiled: JSON.parse(row.compiled),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      })
    );
  }

  deleteRule(id: string): void {
    const stmt = this.db.prepare('DELETE FROM rules WHERE id = ?');
    stmt.run(id);
    logger.debug('Rule deleted', { id });
  }

  // Channels
  saveChannel(channel: ChannelConfig): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO channels (id, type, name, enabled, config, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      channel.id,
      channel.type,
      channel.name,
      channel.enabled ? 1 : 0,
      JSON.stringify(channel.config),
      channel.createdAt.toISOString(),
      channel.updatedAt.toISOString()
    );

    logger.debug('Channel saved', { id: channel.id, type: channel.type });
  }

  getAllChannels(): ChannelConfig[] {
    const stmt = this.db.prepare('SELECT * FROM channels ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];

    return rows.map((row) =>
      Schemas.ChannelConfig.parse({
        ...row,
        enabled: row.enabled === 1,
        config: JSON.parse(row.config),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      })
    );
  }

  // Models
  saveModel(model: ModelConfig): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO models (id, provider, model, apiKey, baseUrl, enabled, isDefault, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      model.id,
      model.provider,
      model.model,
      model.apiKey || null,
      model.baseUrl || null,
      model.enabled ? 1 : 0,
      model.isDefault ? 1 : 0,
      model.createdAt.toISOString(),
      model.updatedAt.toISOString()
    );

    logger.debug('Model saved', { id: model.id, provider: model.provider });
  }

  getAllModels(): ModelConfig[] {
    const stmt = this.db.prepare('SELECT * FROM models ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];

    return rows.map((row) =>
      Schemas.ModelConfig.parse({
        ...row,
        apiKey: row.apiKey || undefined,
        baseUrl: row.baseUrl || undefined,
        enabled: row.enabled === 1,
        isDefault: row.isDefault === 1,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      })
    );
  }

  // Permissions
  savePermission(permission: PermissionConfig): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO permissions (id, allowRead, allowWrite, deny, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      permission.id,
      JSON.stringify(permission.allowRead),
      JSON.stringify(permission.allowWrite),
      JSON.stringify(permission.deny),
      permission.createdAt.toISOString(),
      permission.updatedAt.toISOString()
    );

    logger.debug('Permission saved', { id: permission.id });
  }

  getPermission(): PermissionConfig | null {
    const stmt = this.db.prepare('SELECT * FROM permissions LIMIT 1');
    const row = stmt.get() as any;

    if (!row) return null;

    return Schemas.PermissionConfig.parse({
      ...row,
      allowRead: JSON.parse(row.allowRead),
      allowWrite: JSON.parse(row.allowWrite),
      deny: JSON.parse(row.deny),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  close(): void {
    this.db.close();
    logger.info('Storage closed');
  }
}

// Singleton instance
let storageInstance: Storage | null = null;

export function getStorage(): Storage {
  if (!storageInstance) {
    storageInstance = new Storage();
  }
  return storageInstance;
}
