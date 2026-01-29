# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm install      # Install dependencies
npm run build    # Compile TypeScript to dist/
```

No test framework is currently configured.

## Architecture

This is a **Homebridge platform plugin** that registers webhook endpoints with a BTicino c300x-controller intercom system. It does not create HomeKit accessories.

### Key Components

**Single file architecture** (`src/index.ts`):
- `BTicinoRegistrationPlatform` - DynamicPlatformPlugin implementation
- `BTicinoConfig` - Configuration interface extending PlatformConfig
- Plugin registration via `api.registerPlatform()`

### Plugin Lifecycle

1. **Constructor**: Validates config, sets defaults, registers event handlers
2. **didFinishLaunching**: Triggers initial registration + starts interval timer
3. **shutdown**: Cleans up the registration interval

### Endpoint Registration Flow

The plugin registers three webhook URLs with the BTicino controller at `http://{bticinoIP}:8080/register-endpoint`:
- `/doorbell` - Doorbell pressed events
- `/locked` - Door locked events
- `/unlocked` - Door unlocked events

URLs are Base64-encoded before sending. Registration auto-renews every N minutes (default: 4) because the c300x-controller expires endpoints after 5 minutes.

### Configuration Schema

Required: `bticinoIP`, `homebridgeIP`
Optional: `webhookPort` (8081), `interval` (4 min), `identifier` ("homebridge")

## Development Notes

- TypeScript strict mode enabled
- Target: ES2022, CommonJS modules
- Requires Node >=18.0.0, Homebridge >=1.6.0
- Uses native `fetch()` for HTTP requests (no external HTTP dependencies)
- Platform name for config.json: `BTicinoRegistration`
