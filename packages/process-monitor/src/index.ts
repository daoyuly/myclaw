/**
 * MyClaw Process Monitor
 * Monitors child processes and tracks resource usage
 */

import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { logger } from '@myclaw/logger';

/**
 * Process statistics
 */
export interface ProcessStats {
  pid: number;
  cpu: number; // CPU usage percentage
  memory: number; // Memory usage in bytes
  uptime: number; // Process uptime in seconds
  timestamp: number;
}

/**
 * Process event
 */
export interface ProcessEvent {
  type: 'spawn' | 'exit' | 'error' | 'crash' | 'restart' | 'stats';
  pid?: number;
  data?: any;
  timestamp: number;
}

/**
 * Process Monitor configuration
 */
export interface ProcessMonitorConfig {
  statsInterval?: number; // How often to collect stats (ms)
  maxEvents?: number; // Maximum events to keep in history
  crashThreshold?: number; // Crashes within this window trigger alert
  crashWindowMs?: number; // Time window for crash detection
}

/**
 * Monitored process info
 */
interface MonitoredProcess {
  process: ChildProcess;
  name: string;
  startTime: number;
  events: ProcessEvent[];
  stats: ProcessStats[];
  crashCount: number;
  lastCrashTime?: number;
}

/**
 * Process Monitor
 *
 * Monitors child processes, tracks resource usage, and detects crashes
 */
export class ProcessMonitor extends EventEmitter {
  private config: Required<ProcessMonitorConfig>;
  private processes: Map<number, MonitoredProcess> = new Map();
  private statsTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor(config: ProcessMonitorConfig = {}) {
    super();

    this.config = {
      statsInterval: 5000, // 5 seconds
      maxEvents: 100,
      crashThreshold: 3,
      crashWindowMs: 60000, // 1 minute
      ...config,
    };

    logger.debug('ProcessMonitor initialized', { config: this.config });
  }

  /**
   * Start monitoring a process
   */
  monitor(process: ChildProcess, name: string): void {
    if (!process.pid) {
      logger.error('Cannot monitor process without PID');
      return;
    }

    const pid = process.pid;

    // Check if already monitoring
    if (this.processes.has(pid)) {
      logger.warn('Process already being monitored', { pid, name });
      return;
    }

    logger.info('Starting process monitoring', { pid, name });

    // Store process info
    const monitored: MonitoredProcess = {
      process,
      name,
      startTime: Date.now(),
      events: [],
      stats: [],
      crashCount: 0,
    };

    this.processes.set(pid, monitored);

    // Record spawn event
    this.recordEvent(pid, 'spawn', { name });

    // Setup process event handlers
    this.setupProcessHandlers(process, pid, name);

    // Start stats collection
    this.startStatsCollection(pid);

    this.emit('monitor', { pid, name });
  }

  /**
   * Stop monitoring a process
   */
  unmonitor(pid: number): void {
    const monitored = this.processes.get(pid);
    if (!monitored) {
      logger.warn('Process not being monitored', { pid });
      return;
    }

    logger.info('Stopping process monitoring', { pid, name: monitored.name });

    // Stop stats collection
    this.stopStatsCollection(pid);

    // Remove from map
    this.processes.delete(pid);

    this.emit('unmonitor', { pid, name: monitored.name });
  }

  /**
   * Get process statistics
   */
  getStats(pid: number): ProcessStats[] | undefined {
    const monitored = this.processes.get(pid);
    return monitored?.stats;
  }

  /**
   * Get latest stats for a process
   */
  getLatestStats(pid: number): ProcessStats | undefined {
    const monitored = this.processes.get(pid);
    if (!monitored || monitored.stats.length === 0) {
      return undefined;
    }
    return monitored.stats[monitored.stats.length - 1];
  }

  /**
   * Get process events
   */
  getEvents(pid: number): ProcessEvent[] | undefined {
    const monitored = this.processes.get(pid);
    return monitored?.events;
  }

  /**
   * Get all monitored processes
   */
  getMonitoredProcesses(): Array<{ pid: number; name: string; uptime: number }> {
    const result: Array<{ pid: number; name: string; uptime: number }> = [];
    const now = Date.now();

    this.processes.forEach((monitored, pid) => {
      result.push({
        pid,
        name: monitored.name,
        uptime: Math.floor((now - monitored.startTime) / 1000),
      });
    });

    return result;
  }

  /**
   * Check if process is crashing frequently
   */
  isProcessCrashing(pid: number): boolean {
    const monitored = this.processes.get(pid);
    if (!monitored) {
      return false;
    }

    const now = Date.now();
    const windowStart = now - this.config.crashWindowMs;

    // Count crashes within window
    const recentCrashes = monitored.events.filter(
      (e) => e.type === 'crash' && e.timestamp >= windowStart
    ).length;

    return recentCrashes >= this.config.crashThreshold;
  }

  /**
   * Get crash report for a process
   */
  getCrashReport(pid: number): {
    crashCount: number;
    isCrashing: boolean;
    recentCrashes: ProcessEvent[];
  } | undefined {
    const monitored = this.processes.get(pid);
    if (!monitored) {
      return undefined;
    }

    const now = Date.now();
    const windowStart = now - this.config.crashWindowMs;
    const recentCrashes = monitored.events.filter(
      (e) => e.type === 'crash' && e.timestamp >= windowStart
    );

    return {
      crashCount: monitored.crashCount,
      isCrashing: this.isProcessCrashing(pid),
      recentCrashes,
    };
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    logger.info('Stopping all process monitoring');

    this.processes.forEach((_, pid) => {
      this.stopStatsCollection(pid);
    });

    this.processes.clear();
    this.emit('stop');
  }

  // Private methods

  private setupProcessHandlers(process: ChildProcess, pid: number, name: string): void {
    // Exit handler
    process.on('exit', (code, signal) => {
      this.handleProcessExit(pid, code, signal);
    });

    // Error handler
    process.on('error', (error) => {
      this.handleProcessError(pid, error);
    });
  }

  private handleProcessExit(pid: number, code: number | null, signal: string | null): void {
    const monitored = this.processes.get(pid);
    if (!monitored) {
      return;
    }

    logger.info('Process exited', { pid, name: monitored.name, code, signal });

    // Determine if crash
    const isCrash = code !== null && code !== 0;

    if (isCrash) {
      monitored.crashCount++;
      monitored.lastCrashTime = Date.now();
      this.recordEvent(pid, 'crash', { code, signal });
      this.emit('crash', { pid, name: monitored.name, code, signal });

      // Check if crashing frequently
      if (this.isProcessCrashing(pid)) {
        logger.error('Process is crashing frequently', {
          pid,
          name: monitored.name,
          crashCount: monitored.crashCount,
        });
        this.emit('crash-loop', { pid, name: monitored.name });
      }
    } else {
      this.recordEvent(pid, 'exit', { code, signal });
      this.emit('exit', { pid, name: monitored.name, code, signal });
    }

    // Stop monitoring
    this.unmonitor(pid);
  }

  private handleProcessError(pid: number, error: Error): void {
    const monitored = this.processes.get(pid);
    if (!monitored) {
      return;
    }

    logger.error('Process error', { pid, name: monitored.name, error: error.message });
    this.recordEvent(pid, 'error', { error: error.message });
    this.emit('error', { pid, name: monitored.name, error });
  }

  private startStatsCollection(pid: number): void {
    const timer = setInterval(() => {
      this.collectStats(pid);
    }, this.config.statsInterval);

    this.statsTimers.set(pid, timer);
  }

  private stopStatsCollection(pid: number): void {
    const timer = this.statsTimers.get(pid);
    if (timer) {
      clearInterval(timer);
      this.statsTimers.delete(pid);
    }
  }

  private collectStats(pid: number): void {
    const monitored = this.processes.get(pid);
    if (!monitored || !monitored.process.pid) {
      return;
    }

    try {
      // Get process stats (simplified - in production would use system-specific APIs)
      const stats: ProcessStats = {
        pid: monitored.process.pid,
        cpu: 0, // Would need platform-specific code
        memory: process.memoryUsage().rss, // Simplified
        uptime: Math.floor((Date.now() - monitored.startTime) / 1000),
        timestamp: Date.now(),
      };

      monitored.stats.push(stats);

      // Keep only recent stats (last 100)
      if (monitored.stats.length > 100) {
        monitored.stats.shift();
      }

      this.recordEvent(pid, 'stats', stats);
      this.emit('stats', { pid, name: monitored.name, stats });
    } catch (error: any) {
      logger.warn('Failed to collect process stats', { pid, error: error.message });
    }
  }

  private recordEvent(pid: number, type: ProcessEvent['type'], data?: any): void {
    const monitored = this.processes.get(pid);
    if (!monitored) {
      return;
    }

    const event: ProcessEvent = {
      type,
      pid,
      data,
      timestamp: Date.now(),
    };

    monitored.events.push(event);

    // Keep only recent events
    if (monitored.events.length > this.config.maxEvents) {
      monitored.events.shift();
    }
  }
}

/**
 * Create a ProcessMonitor instance
 */
export function createProcessMonitor(config?: ProcessMonitorConfig): ProcessMonitor {
  return new ProcessMonitor(config);
}
