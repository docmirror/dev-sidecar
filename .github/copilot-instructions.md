# Copilot instructions for dev-sidecar

## Commands

- Dependency management:
  - Install dependencies for the entire workspace from the repository root using `pnpm install`. Avoid using `npm install` for dependency installation in this project.
  - If `pnpm install` reports dependency conflicts or version mismatches, update the relevant `package.json` entries to compatible versions (or adjust `peerDependencies`), then re-run `pnpm install`.

- Linting:
  - Lint the repository from the root with `pnpm lint`.
  - Auto-fix lint issues from the root with `pnpm lint:fix`.
  - If `pnpm lint` or `pnpm lint:fix` fails, review the reported errors and manually fix the files indicated by the linter, then re-run the command.

- Testing:
  - Run package tests where they live:
    - `pnpm --filter @docmirror/dev-sidecar test`
    - `pnpm --filter @docmirror/mitmproxy test`
  - Run a single test file by passing it after `--`, for example:
    - `pnpm --filter @docmirror/dev-sidecar test -- test/regex.test.js`
    - `pnpm --filter @docmirror/mitmproxy test -- test/proxyTest.js`

- GUI development and packaging (from `packages/gui`):
  - `npm run electron`
  - `npm run electron:build`
  - `npm run serve`
  - `npm run lint`
  - For GUI debugging: run `npm run electron` and open the Electron developer tools (application menu View → Toggle Developer Tools or the platform shortcut) to inspect renderer pages, console logs, and IPC traffic.

## High-level architecture

- This is a pnpm workspace monorepo with four packages:
  - `packages/core`: shared app logic, config, shell helpers, system proxy handling, and plugin/module code.
  - `packages/mitmproxy`: the HTTP(S) proxy, DNS, interception, PAC, and response/request rewrite layer.
  - `packages/gui`: the Electron + Vue 2 desktop app.
  - `packages/cli`: a small CLI entrypoint that loads user config and starts the proxy service.
- `packages/core/src/index.js` exposes the main API and owns process-level error handling plus config/state wiring.
- `packages/mitmproxy/src/index.js` creates the proxy server(s), applies proxy options, and reports status/errors back to the host process.
- `packages/gui/src/background.js` is the Electron main process: it loads config, creates the main window, tray, IPC bridges, and Windows-specific power-monitor behavior.
- Renderer code lives under `packages/gui/src/view/`; IPC/bridge code lives under `packages/gui/src/bridge/`.
- The CLI reads `packages/cli/src/user_config.json5`, prints a banner, and starts the core API with the mitmproxy service path.

## Repo-specific conventions

- Most runtime code in `core`, `mitmproxy`, and `cli` uses CommonJS; GUI code is the Electron/Vue app and is organized around the Electron main process plus renderer/bridge split.
- Keep GUI source imports aligned with the existing file layout and `.js` module naming used in the Electron entrypoints.
- Preserve the startup/shutdown flow: ensure the sequence remains where `core` initializes and manages the proxy lifecycle, `mitmproxy` performs network interception, and the GUI communicates exclusively through IPC bridges and the `core` API; avoid direct cross-component calls that bypass these boundaries.
- Native/module setup matters here: the repo uses a root `.npmrc` with a PhantomJS mirror and C++17 build flags for native modules.
- The project documents Node 22.x, Python 3.11/setuptools, and VS 2022 C++ tooling as the expected local environment for Windows builds.
