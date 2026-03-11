/**
 * MyClaw Gateway Launcher (Enhanced)
 * Manages OpenClaw gateway lifecycle with monitoring and env management
 */

import { spawn, ChildProcess } from 'child_process';
import { gatewayLogger as logger } from '@myclaw/logger';
import type { GatewayState } from '@myclaw/core';
import { Schemas } from '@myclaw/core';
import { setTimeout as sleep } from 'timers/promises';
import { ProcessMonitor, ProcessStats } from '@myclaw/process-monitor';
import { EnvManager } from '@myclaw/env-manager';
import { EventEmitter } from 'events';

/**
 * Enhanced Gateway configuration
 */
export interface GatewayConfig {
  openclawPath: string;
  configDir: string;
  port?: number;
  maxRestarts?: number;
  healthCheckInterval?: number;
  enableMonitoring?: boolean;
  envFile?: string;
}

/**
 * Gateway health status
 */
export interface GatewayHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  uptime: number;
  stats?: ProcessStats;
}

/**
 * Enhanced Gateway Launcher
 *
 * Features:
 * - Process lifecycle management
 * - Automatic restart with backoff
 * - Health checks
 * - Resource monitoring
 * - Environment variable management
 * - Event emission
 */
export class GatewayLauncher extends EventEmitter {
  private process: ChildProcess | null = null;
  private state: GatewayState;
  private config: Required<GatewayConfig>;
  private restartAttempts = 0;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private processMonitor: ProcessMonitor;
  private envManager: EnvManager;
  private startTime: number = 0;

  constructor(config: GatewayConfig) {
    super();

    this.config = {
      maxRestarts: 5,
      healthCheckInterval: 30000,
      port: 3210,
      enableMonitoring: true,
      envFile: '.env',
      ...config,
    };

    this.state = Schemas.GatewayState.parse({
      status: 'stopped',
      restartCount: 0,
    });

    // Initialize process monitor
    this.processMonitor = new ProcessMonitor({
      statsInterval: 5000,
      crashThreshold: 3,
      crashWindowMs: 60000,
    });

    // Initialize env manager
    this.envManager = new EnvManager({
      envFile: this.config.envFile,
      useKeychain: false, // Gateway doesn't need keychain
    });

    // Setup process monitor event handlers
    this.processMonitor.on('crash', ({ name, code }) => {
      logger.error('Gateway process crashed', { name, code });
      this.emit('crash', { name, code });
    });

    this.processMonitor.on('stats', ({ stats }) => {
      this.emit('stats', stats);
    });

    logger.info('GatewayLauncher initialized', { config: this.config });
  }

  /**
   * Start the gateway
   */
  async start(): Promise<void> {
    if (this.state.status === 'running') {
      logger.warn('Gateway already running');
      return;
    }

    logger.info('Starting gateway...');
    this.emit('starting');
    this.updateState({ status: 'starting' });

    try {
      // Load environment variables
      await this.envManager.load();

      // Spawn the process
      await this.spawnProcess();

      // Start monitoring if enabled
      if (this.config.enableMonitoring && this.process?.pid) {
        this.processMonitor.monitor(this.process, 'openclaw-gateway');
      }

      // Wait for healthy status
      await this.waitForHealthy();

      // Start health check timer
      this.startHealthCheck();

      this.startTime = Date.now();
      this.updateState({
        status: 'running',
        pid: this.process?.pid,
        startedAt: new Date(),
      });

      logger.info('Gateway started successfully', { pid: this.process?.pid });
      this.emit('started', { pid: this.process?.pid });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.updateState({
        status: 'error',
        errorMessage,
      });

      logger.error('Failed to start gateway', error);
      this.emit('error', error);

      if (this.restartAttempts < this.config.maxRestarts) {
        await this.restartWithBackoff();
      } else {
        throw error;
      }
    }
  }

  /**
   * Stop the gateway
   */
  async stop(): Promise<void> {
    if (this.state.status !== 'running') {
      logger.warn('Gateway not running');
      return;
    }

    logger.info('Stopping gateway...');
    this.emit('stopping');

    this.stopHealthCheck();

    if (this.process?.pid) {
      this.processMonitor.unmonitor(this.process.pid);
    }

    if (this.process) {
      this.process.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        this.process!.on('exit', () => resolve());
        setTimeout(() => {
          this.process!.kill('SIGKILL');
          resolve();
        }, 5000).unref();
      });
    }

    this.process = null;
    this.updateState({
      status: 'stopped',
      pid: undefined,
      startedAt: undefined,
    });

    logger.info('Gateway stopped');
    this.emit('stopped');
  }

  /**
   * Restart the gateway
   */
  async restart(): Promise<void> {
    logger.info('Restarting gateway...');
    this.emit('restarting');

    await this.stop();
    await sleep(1000);
    await this.start();

    logger.info('Gateway restarted');
  }

  /**
   * Get gateway state
   */
  getState(): GatewayState {
    return { ...this.state };
  }

  /**
   * Get gateway health
   */
  async getHealth(): Promise<GatewayHealth> {
    const stats = this.process?.pid
      ? this.processMonitor.getLatestStats(this.process.pid)
      : undefined;

    return {
      status: this.state.status === 'running' ? 'healthy' : 'unhealthy',
      lastCheck: new Date(),
      uptime: this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      stats,
    };
  }

  /**
   * Get process stats
   */
  getStats(): ProcessStats[] | undefined {
    return this.process?.pid
      ? this.processMonitor.getStats(this.process.pid)
      : undefined;
  }

  /**
   * Get latest stats
   */
  getLatestStats(): ProcessStats | undefined {
    return this.process?.pid
      ? this.processMonitor.getLatestStats(this.process.pid)
      : undefined;
  }

  /**
   * Check if gateway is running
   */
  isRunning(): boolean {
    return this.state.status === 'running';
  }

  /**
   * Get environment variable
   */
  getEnv(key: string): string | undefined {
    return this.envManager.get(key);
  }

  /**
   * Set environment variable
   */
  async setEnv(key: string, value: string, sensitive = false): Promise<void> {
    await this.envManager.set(key, value, sensitive);
  }

  // Private methods

  private async spawnProcess(): Promise<void> {
    logger.debug('Spawning OpenClaw process', {
      path: this.config.openclawPath,
      args: ['gateway', 'start', '--config', this.config.configDir],
    });

    this.process = spawn(
      this.config.openclawPath,
      ['gateway', 'start', '--config', this.config.configDir],
      {
        env: {
          ...process.env,
          ...this.envManager.getAll(),
          OPENCLAW_GATEWAY_PORT: String(this.config.port),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    if (!this.process.pid) {
      throw new Error('Failed to spawn gateway process');
    }

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      logger.info('Gateway process exited', { code, signal });

      if (code !== 0 && code !== null) {
        this.updateState({
          status: 'error',
          errorMessage: `Process exited with code ${code}`,
        });
      }
    });

    // Capture stdout/stderr
    this.process.stdout?.on('data', (data) => {
      this.emit('stdout', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.emit('stderr', data.toString());
    });

    await sleep(1000); // Wait for process to start
  }

  private async waitForHealthy(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.config.port}/health`);
        if (response.ok) {
          logger.debug('Gateway health check passed');
          return;
        }
      } catch (error) {
        // Gateway not ready yet
      }

      await sleep(delayMs);
    }

    throw new Error('Gateway health check timeout');
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${this.config.port}/health`);
        if (!response.ok) {
          logger.warn('Gateway health check failed');
          this.emit('unhealthy');
        }
      } catch (error) {
        logger.error('Gateway health check error', error);
        this.emit('unhealthy');
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async restartWithBackoff(): Promise<void> {
    this.restartAttempts++;
    const backoffMs = Math.min(1000 * Math.pow(2, this.restartAttempts), 60000);

    logger.warn('Restarting with backoff', {
      attempt: this.restartAttempts,
      backoffMs,
    });

    this.updateState({ restartCount: this.state.restartCount + 1 });
    this.emit('restart', { attempt: this.restartAttempts, backoffMs });

    await sleep(backoffMs);
    await this.start();
  }

  private updateState(updates: Partial<GatewayState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('state-change', this.state);
  }
}

/**
 * Create a GatewayLauncher instance
 */
export function createGatewayLauncher(config: GatewayConfig): GatewayLauncher {
  return new GatewayLauncher(config);
}
