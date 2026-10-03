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
- `pnpm --filter @blue-frontier/dev-sidecar test` — run core package tests (Mocha + Chai)
- `pnpm --filter @blue-frontier/mitmproxy test` — run proxy package tests
- Run a single test file:
  - `pnpm --filter @blue-frontier/dev-sidecar test -- test/regex.test.js`
  - `pnpm --filter @blue-frontier/mitmproxy test -- test/proxyTest.js`

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

## Committing Changes

When work is finished and ready to commit, the AI assistant stages files, but the **human runs the commit command manually** — every contributor signs their own commits with their personal GPG/SSH key, which the assistant cannot access.

1. **Review first**: run `git status`, `git diff`, and `git log --oneline -10` (to match the repo's message style). Stage only intended files; never stage secrets, build artifacts, or unrelated changes.
2. **Stage properly**: use `git add <files>` for new/modified files and `git rm <files>` for deletions (or `git add -u` to record filesystem deletions). Verify the staged set with `git status` before proceeding.
3. **Do NOT run `git commit` yourself.** Instead, print the **full `git commit` command** and let the user execute it manually, e.g.:
   ```
   git commit -m "fix(cli): 修复 xxx"
   ```
4. **Commit message style**: follow the repo's convention — a `type(scope): subject` prefix (`fix(scope):`, `feat(scope):`, `chore:`, ...) with a Chinese summary; include a body of bullet points for non-trivial changes. Do not add signing flags (`--no-gpg-sign`, `--no-verify`) or commit/push on the user's behalf unless explicitly requested.
5. **Push only when explicitly asked**, and only after the user has committed.

## Architecture

This is a **pnpm workspace monorepo** (`pnpm@9.13.2`) for a developer-sidecar proxy tool that accelerates access to GitHub, npm, Docker Hub, and other foreign sites for Chinese developers. It works by running a local MITM HTTPS proxy, injecting a root CA certificate, and applying DNS optimization, SNI rewriting, and request interception/redirection rules.

### Package dependency graph
```
gui / cli
   │
   ▼
@blue-frontier/dev-sidecar  (packages/core)
   │
   ├── forks-as-child-process ──► @blue-frontier/mitmproxy
   │                              (packages/mitmproxy)
   └── uses workspace link ◄─────┘
```

Kernel packages live in the **git submodule** `vendor/ds-core` (repo: Blue-Frontier/ds-core, flattened: `core/` + `mitmproxy/` at submodule root). `packages/core` and `packages/mitmproxy` are **relative** symlinks into that submodule so the monorepo layout matches the historical `packages/*` shape. Because the submodule lives outside `packages/`, the workspace glob needs no exclusion rule for it.

### Packages

**`packages/core`** (`@blue-frontier/dev-sidecar`) — The orchestrator.
- Entry: `src/index.js` → `src/expose.js`. Exports `startup()`, `shutdown()`, plus `config`, `event`, `shell`, `server`, `proxy`, `plugin`, `status`.
- Startup sequence: merge config → fork mitmproxy child process → set OS-level system proxy → start plugins (git, node, pip, overwall).
- Config merges 4 layers: defaults (`src/config/index.js`, ~470 lines) → remote shared → remote personal → user overrides (`~/.dev-sidecar/config.json`).
- Shell helpers (`src/shell/`) abstract OS commands: setting system proxy, installing CA certs, enabling loopback, killing processes by port.
- Plugins (`src/modules/plugin/`) follow a uniform `{ key, config, status, plugin: Factory(context) }` pattern.

**`packages/mitmproxy`** (`@blue-frontier/mitmproxy`) — The proxy engine (runs as a child process).
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

**`packages/aur/`** — Arch Linux PKGBUILD (not a JS package). Kernel sources come from submodule `vendor/ds-core` via the `packages/core` / `packages/mitmproxy` symlinks.

### Key conventions
- **Module systems**: `core`, `mitmproxy`, and `cli` use implicit CommonJS (`.js` files, no `"type": "module"`). `gui` uses ESM (`"type": "module"`). The root `package.json` declares `"type": "module"` but this only affects root-level scripts.
- **Shared JSON5 parser**: `@blue-frontier/mitmproxy/src/json` (in `packages/mitmproxy`) is used across all packages for JSON5 config parsing.
- **Logging**: log4js-based; log files at `~/.dev-sidecar/logs/core.log`, `gui.log`, `server.log`. Logger factory at `packages/core/src/utils/util.logger.js`. Every category writes to file and, by default, also to stdout (`std` appender); set `DEV_SIDECAR_LOG_TO_CONSOLE=false` to keep logs file-only (CLI daemon sets this automatically).
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

### Bug 修复记录（必须维护）

- **文档位置**：`D:\dev-sidecar-bugfixes.md`，**在仓库目录之外，不进 git 仓库**。
- **必须及时更新**：每修一个 bug（或发现既有记录与事实不符）都**立刻**更新该文档，不要拖到收尾。
- **每条必须包含**：bug 描述、复现方式、原因、修复思路、具体修改的**文件路径 + 行号**。
- **末尾必须有「复现方式汇总」**：集中列出所有 bug 的复现步骤，便于用户逐个亲自检查是否已修复。

**复核义务**：代码结构变化后（如子模块 flatten、文件瘦身、配置改由远程下发）要回头修正失效的路径与行号，
并显式标注哪些修复**已失效 / 被回退**（例：见该文档 #9 的「DNS 走 quad9」）。

### 测试代码维护

- 随着代码的变更，要**及时修改、补充或删除测试代码** —— 不让测试代码与实现脱节。
- 新增 / 修改功能时同步更新对应测试；删除功能时一并删除其测试。
- 测试代码不受生产代码的行数约束，但必须保持**可运行**。

### 改默认配置规则的正确姿势

- `core/src/config/index.js` 的 `intercepts` / `preSetIpList` / `whiteList` / `dns`，
  由构建脚本 `_script/sync-official-config.mjs` 从 **official 仓库**整体替换（「照搬」，不是深合并）。
- **因此：改这些规则必须改 official 仓库**（`https://ds-official-config.bestar.de5.net/remote_config.json5`）。
  **改本地无效** —— 下次构建同步就会被整体覆盖。
- 官方配置地址常量：`HIGHEST_PRIORITY_ONCE_OVERRIDE_OFFICIAL_REMOTE_CONFIG_URL`（在 `core/src/config/index.js`）。
  用户本地残留的旧地址会被**一次性**纠正（只纠 `ONCE_OVERRIDE_DEPRECATED_REMOTE_CONFIG_URLS` 里列出的历史地址，
  用户自建镜像 / 留空禁用一律保留）。
