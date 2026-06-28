# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Dependency Management
- Always use `pnpm install` (not `npm install`) from the repository root. The project uses pnpm workspaces with `shamefully-hoist=true`.
- If `pnpm install` reports conflicts, update the relevant `package.json` entries to compatible versions and re-run.

### Linting
- `pnpm lint` — lint the entire repo (ESLint flat config via `@antfu/eslint-config`)
- `pnpm lint:fix` — auto-fix lint issues

### Testing
- `pnpm --filter @docmirror/dev-sidecar test` — run core package tests (Mocha + Chai)
- `pnpm --filter @docmirror/mitmproxy test` — run proxy package tests
- Run a single test file:
  - `pnpm --filter @docmirror/dev-sidecar test -- test/regex.test.js`
  - `pnpm --filter @docmirror/mitmproxy test -- test/proxyTest.js`

### GUI Development (from `packages/gui/`)
- `npm run electron` — launch the Electron app in dev mode (starts Vue dev server + Electron)
- `npm run serve` — run only the Vue dev server (port 8080)
- `npm run electron:build` — production build (Vue build + electron-builder)
- `npm run lint` — lint GUI code only
- For debugging: run `npm run electron` and open DevTools (`F12` or View → Toggle Developer Tools)

### Python Environment (needed for native module builds)
```shell
uv init .
uv sync
.venv/Scripts/activate   # Windows; use `source .venv/bin/activate` on Linux/macOS
```

## Architecture

This is a **pnpm workspace monorepo** (`pnpm@9.13.2`) for a developer-sidecar proxy tool that accelerates access to GitHub, npm, Docker Hub, and other foreign sites for Chinese developers. It works by running a local MITM HTTPS proxy, injecting a root CA certificate, and applying DNS optimization, SNI rewriting, and request interception/redirection rules.

### Package dependency graph
```
gui ──depends-on──> core ──forks-as-child-process──> mitmproxy
                      ^                                ^
cli ──────────────────┴────────────────────────────────┘
```

### Packages

**`packages/core`** (`@docmirror/dev-sidecar`) — The orchestrator.
- Entry: `src/index.js` → `src/expose.js`. Exports `startup()`, `shutdown()`, plus `config`, `event`, `shell`, `server`, `proxy`, `plugin`, `status`.
- Startup sequence: merge config → fork mitmproxy child process → set OS-level system proxy → start plugins (git, node, pip, overwall).
- Config merges 4 layers: defaults (`src/config/index.js`, ~470 lines) → remote shared → remote personal → user overrides (`~/.dev-sidecar/config.json`).
- Shell helpers (`src/shell/`) abstract OS commands: setting system proxy, installing CA certs, enabling loopback, killing processes by port.
- Plugins (`src/modules/plugin/`) follow a uniform `{ key, config, status, plugin: Factory(context) }` pattern.

**`packages/mitmproxy`** (`@docmirror/mitmproxy`) — The proxy engine (runs as a child process).
- Entry: `src/index.js`. Creates HTTP and HTTPS proxy servers on consecutive ports (default: 31180 HTTP, 31181 HTTPS).
- Interceptor pipeline (`src/lib/interceptor/`): priority-ordered interceptors match domains+paths and apply actions (redirect, proxy, abort, cache, SNI rewrite, OPTIONS preflight, response replace, script injection).
- TLS/cert handling (`src/lib/proxy/tls/`): generates a local CA root cert (`~/.dev-sidecar/dev-sidecar.ca.crt`), then creates per-domain fake certs signed by it using `node-forge`. Fake servers are LRU-cached.
- DNS system (`src/lib/dns/`): multi-provider DNS resolution (UDP, TCP, DoH, DoT, preset IPs). Supports SNI-specific DNS lookup.
- Speed test (`src/lib/speed/`): measures latency/availability to domains, used for IP selection.
- `RequestCounter` (`src/lib/choice/`): dynamic backup failover — tracks success/failure per backend, switches after 3 consecutive errors or <40% success rate.

**`packages/gui`** (`@docmirror/dev-sidecar-gui`) — Electron + Vue 3 desktop app.
- Main process: `src/background.js` — creates BrowserWindow, system tray, IPC bridges, single-instance lock, Windows shutdown hook.
- Renderer: Vue 3 with Vue Router (hash mode), Ant Design Vue 4, dark theme support.
- IPC bridge (`src/bridge/`): dynamic RPC — main process exposes a flat API list, renderer calls methods via `ipcRenderer.invoke('apiInvoke', [path, args])`. Core events (status, error, speed) flow main→renderer via `webContents.send`.
- Pages: dashboard (index), accelerator server, system proxy, settings, help, plus per-plugin pages (free-eye, git, node, overwall, pip).

**`packages/cli`** (`@docmirror/dev-sidecar-cli`) — Headless CLI launcher. Reads user config, calls `DevSidecar.api.startup()`.

**`packages/aur/`** — Arch Linux PKGBUILD (not a JS package). **`packages/cli2/`** — abandoned placeholder, ignore it.

### Key conventions
- **Module systems**: `core`, `mitmproxy`, and `cli` use implicit CommonJS (`.js` files, no `"type": "module"`). `gui` uses ESM (`"type": "module"`). The root `package.json` declares `"type": "module"` but this only affects root-level scripts.
- **Shared JSON5 parser**: `@docmirror/mitmproxy/src/json` is used across all packages for JSON5 config parsing.
- **Logging**: log4js-based; log files at `~/.dev-sidecar/logs/core.log`, `gui.log`, `server.log`. Logger factory at `packages/core/src/utils/util.logger.js`.
- **Status/event bus**: `core/src/event.js` (EventEmitter) and `core/src/status.js` (central status tree updated via events).
- **CA certificate**: stored at `~/.dev-sidecar/dev-sidecar.ca.crt` and `~/.dev-sidecar/dev-sidecar.ca.key.pem`. Generated locally on first run.
- **Config on disk**: user overrides saved as diffs in `~/.dev-sidecar/config.json`. Merged runtime config written as `running.json` for the child process.

### Build environment requirements
- Node.js 22.x
- Python 3.11 with setuptools (or use `uv` with the project's `.python-version` and `pyproject.toml`)
- VS 2022 with C++ desktop development workload (Windows)
- Native modules need C++17: the `.npmrc` sets `CXXFLAGS="-std=c++17"`

### Vue config gotcha
`packages/gui/vue.config.cjs` sets `concatenateModules: false` in webpack production builds. This is **intentional** — module concatenation breaks ant-design-vue's Symbol-based `provide/inject`, causing menu crashes, dark mode failures, and Select/Dropdown malfunctions.
