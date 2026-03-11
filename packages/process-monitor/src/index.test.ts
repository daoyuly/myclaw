import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { ProcessMonitor, createProcessMonitor } from './index';

describe('ProcessMonitor', () => {
  let monitor: ProcessMonitor;
  let testProcess: ChildProcess | null = null;

  beforeEach(() => {
    monitor = new ProcessMonitor({
      statsInterval: 100, // Fast for testing
      maxEvents: 10,
      crashThreshold: 2,
      crashWindowMs: 1000,
    });
  });

  afterEach(() => {
    monitor.stopAll();
    if (testProcess) {
      testProcess.kill();
      testProcess = null;
    }
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const m = new ProcessMonitor();
      expect(m).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const m = new ProcessMonitor({
        statsInterval: 10000,
        maxEvents: 50,
      });
      expect(m).toBeDefined();
    });
  });

  describe('monitor', () => {
    it('should start monitoring a process', () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      expect(testProcess.pid).toBeDefined();

      const monitorSpy = vi.fn();
      monitor.on('monitor', monitorSpy);

      monitor.monitor(testProcess, 'test-process');

      expect(monitorSpy).toHaveBeenCalledWith({
        pid: testProcess.pid,
        name: 'test-process',
      });

      const processes = monitor.getMonitoredProcesses();
      expect(processes).toHaveLength(1);
      expect(processes[0].name).toBe('test-process');
    });

    it('should not monitor process without PID', () => {
      const mockProcess = {} as ChildProcess;
      monitor.monitor(mockProcess, 'no-pid');

      const processes = monitor.getMonitoredProcesses();
      expect(processes).toHaveLength(0);
    });

    it('should not monitor same process twice', () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);

      monitor.monitor(testProcess, 'test-1');
      monitor.monitor(testProcess, 'test-2');

      const processes = monitor.getMonitoredProcesses();
      expect(processes).toHaveLength(1);
    });
  });

  describe('unmonitor', () => {
    it('should stop monitoring a process', () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      expect(testProcess.pid).toBeDefined();

      monitor.monitor(testProcess, 'test-process');
      expect(monitor.getMonitoredProcesses()).toHaveLength(1);

      monitor.unmonitor(testProcess.pid!);
      expect(monitor.getMonitoredProcesses()).toHaveLength(0);
    });

    it('should handle unmonitoring non-existent process', () => {
      expect(() => monitor.unmonitor(99999)).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return undefined for non-monitored process', () => {
      const stats = monitor.getStats(99999);
      expect(stats).toBeUndefined();
    });

    it('should return stats array for monitored process', async () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      monitor.monitor(testProcess, 'test-process');

      // Wait for at least one stats collection
      await new Promise((resolve) => setTimeout(resolve, 150));

      const stats = monitor.getStats(testProcess.pid!);
      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe('getLatestStats', () => {
    it('should return undefined for non-monitored process', () => {
      const stats = monitor.getLatestStats(99999);
      expect(stats).toBeUndefined();
    });

    it('should return latest stats', async () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      monitor.monitor(testProcess, 'test-process');

      await new Promise((resolve) => setTimeout(resolve, 150));

      const stats = monitor.getLatestStats(testProcess.pid!);
      expect(stats).toBeDefined();
      expect(stats?.pid).toBe(testProcess.pid);
    });
  });

  describe('getEvents', () => {
    it('should return undefined for non-monitored process', () => {
      const events = monitor.getEvents(99999);
      expect(events).toBeUndefined();
    });

    it('should return events for monitored process', () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      monitor.monitor(testProcess, 'test-process');

      const events = monitor.getEvents(testProcess.pid!);
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events!.length).toBeGreaterThan(0);
      expect(events![0].type).toBe('spawn');
    });
  });

  describe('process exit handling', () => {
    it('should handle normal exit', async () => {
      testProcess = spawn('node', ['-e', 'process.exit(0)']);
      const exitSpy = vi.fn();
      monitor.on('exit', exitSpy);

      monitor.monitor(testProcess, 'test-process');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(exitSpy).toHaveBeenCalled();
    });

    it('should handle crash (non-zero exit code)', async () => {
      testProcess = spawn('node', ['-e', 'process.exit(1)']);
      const crashSpy = vi.fn();
      monitor.on('crash', crashSpy);

      monitor.monitor(testProcess, 'test-process');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(crashSpy).toHaveBeenCalled();
    });
  });

  describe('crash detection', () => {
    it('should detect single crash', async () => {
      testProcess = spawn('node', ['-e', 'process.exit(1)']);
      const crashSpy = vi.fn();
      monitor.on('crash', crashSpy);

      monitor.monitor(testProcess, 'test-process');

      // Wait for crash
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(crashSpy).toHaveBeenCalled();
    });

    it('should check if process is crashing', () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      monitor.monitor(testProcess, 'test-process');

      // New process shouldn't be crashing
      expect(monitor.isProcessCrashing(testProcess.pid!)).toBe(false);
    });

    it('should get crash report', () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      monitor.monitor(testProcess, 'test-process');

      const report = monitor.getCrashReport(testProcess.pid!);
      expect(report).toBeDefined();
      expect(report?.crashCount).toBe(0);
      expect(report?.isCrashing).toBe(false);
    });
  });

  describe('stopAll', () => {
    it('should stop all monitoring', () => {
      testProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);
      const anotherProcess = spawn('node', ['-e', 'setTimeout(() => {}, 10000)']);

      monitor.monitor(testProcess, 'test-1');
      monitor.monitor(anotherProcess, 'test-2');

      expect(monitor.getMonitoredProcesses()).toHaveLength(2);

      monitor.stopAll();

      expect(monitor.getMonitoredProcesses()).toHaveLength(0);

      anotherProcess.kill();
    });
  });

  describe('createProcessMonitor', () => {
    it('should create ProcessMonitor instance', () => {
      const m = createProcessMonitor();
      expect(m).toBeInstanceOf(ProcessMonitor);
    });

    it('should create with config', () => {
      const m = createProcessMonitor({ statsInterval: 5000 });
      expect(m).toBeDefined();
    });
  });
});
