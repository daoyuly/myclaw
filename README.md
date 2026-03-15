# MyClaw

A simplified EasyClaw implementation - An easy-mode runtime and UI layer for OpenClaw.

## Features

- 🚀 Gateway lifecycle management with monitoring
- 📝 Natural language rules engine
- 🤖 Multi-LLM provider support
- 💬 Multi-channel messaging integration
- 🔐 File permission control
- 🖥️ Desktop app (Electron)
- 🎨 Web management panel (React)
- 📊 Real-time process monitoring
- 🔧 Environment variable management

## Tech Stack

- **Runtime:** Node.js 24
- **Desktop:** Electron 35
- **Frontend:** React 19 + Vite 6
- **Build:** pnpm workspaces + Turbo
- **Database:** SQLite (better-sqlite3)
- **Language:** TypeScript

## Development

- **Duration:** 26 days (2026-03-07 to 2026-04-01)
- **Work hours:** 19:00 - 05:00 (10 hours/day)
- **Reports:** Daily blog posts at /Users/daoyu/Documents/my-github/new-blog

## Packages (13)

### Core
- **@myclaw/core** - Core types and schemas (27 tests)
- **@myclaw/logger** - Structured logging system (25 tests)
- **@myclaw/storage** - SQLite persistence layer (17 tests)

### Gateway Management
- **@myclaw/gateway** - Enhanced gateway with monitoring (17 tests)
- **@myclaw/process-monitor** - Process lifecycle and resource tracking (21 tests)
- **@myclaw/env-manager** - Multi-source environment variables (18 tests)
- **@myclaw/config-generator** - OpenClaw config generation (7 tests)
- **@myclaw/keychain** - macOS Keychain integration (14 tests)

### Rules & CLI
- **@myclaw/rule-engine** - Natural language rule parser with hot reload (56 tests)
- **@myclaw/skill-generator** - Skill file generator (15 tests)
- **@myclaw/cli** - Command line interface (3 tests)

### LLM Integration
- **@myclaw/llm-providers** - Multi-provider LLM support with routing (42 tests)

### Desktop App
- **@myclaw/desktop** - Electron desktop application (44 tests)
  - System tray integration
  - Local HTTP server (port 3210)
  - Gateway lifecycle control
  - Auto-update support
  - Cross-platform packaging
  - Real-time status monitoring

**Total: 302 tests passing ✅**

## Status

**Current Phase:** Phase 6 - React Management UI ✅ Complete
**Start Date:** 2026-03-07
**Progress:** Day 9 / 26
**Packages:** 13 complete

## Quick Start

```typescript
import { createGatewayLauncher } from '@myclaw/gateway';

const launcher = createGatewayLauncher({
  openclawPath: '/usr/local/bin/openclaw',
  configDir: '~/.myclaw',
  port: 3210,
  enableMonitoring: true,
});

// Event handlers
launcher.on('started', ({ pid }) => {
  console.log(`Gateway started with PID ${pid}`);
});

launcher.on('stats', (stats) => {
  console.log(`CPU: ${stats.cpu}%, Memory: ${stats.memory}MB`);
});

launcher.on('crash', ({ code }) => {
  console.log(`Gateway crashed with code ${code}`);
});

// Start gateway
await launcher.start();

// Get health status
const health = await launcher.getHealth();
console.log(`Status: ${health.status}, Uptime: ${health.uptime}s`);

// Stop gateway
await launcher.stop();
```

## Documentation

- Development Plan: /Users/daoyu/.openclaw/workspace/easyclaw-clone-plan.md
- Fault Tolerance: /Users/daoyu/.openclaw/workspace/myclaw-fault-tolerance.md
- Cron Config: /Users/daoyu/.openclaw/workspace/myclaw-cron-config.md

## License

MIT
