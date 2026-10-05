#!/usr/bin/env node
/**
 * dev-sidecar 开发环境统一启动/检查脚本
 *
 * 用法:
 *   node _script\dev.js --action start
 *   node _script\dev.js --action check
 *   node _script\dev.js --action stop
 *   node _script\dev.js --action restart
 *
 * 可选参数:
 *   --port 8081         # 前端 dev server 端口，默认 8081
 *   --foreground        # start 时前台运行
 *   --skip-kill         # start/restart 时不先结束已占用端口的进程
 */

import { execSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

// 根 package.json 声明了 "type": "module"，本文件按 ESM 解析，__dirname 需自行还原
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 参数解析 ──────────────────────────────────────────────────
const args = process.argv.slice(2);

function flag(name) { return args.includes(name); }
function option(name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const ACTION         = option('--action', 'start');
const DEV_PORT       = parseInt(option('--port', '8081'), 10);
const FOREGROUND     = flag('--foreground');
const SKIP_KILL      = flag('--skip-kill');
const PROXY_HTTP     = 31180;
const PROXY_HTTPS    = 31181;
const PORTS          = [DEV_PORT, PROXY_HTTP, PROXY_HTTPS];
const TIMEOUT_SEC    = 120;

const REPO_ROOT      = path.resolve(__dirname, '..');
const GUI_DIR        = path.join(REPO_ROOT, 'packages', 'gui');
const ELECTRON_DEV   = path.join(__dirname, 'electron-dev.mjs');
const IS_WIN         = process.platform === 'win32';

// ── 受限环境适配（沙箱 / 无 GUI 权限的自动化环境） ─────────────
// 仅在检测到 DSH 沙箱（DSH_SHELL=1）或显式指定 DEV_SIDECAR_SANDBOX_HOME 时生效，
// 也可用 DEV_SIDECAR_NO_SANDBOX_COMPAT=1 关闭。适配三件事：
//   1. 清除 ELECTRON_RUN_AS_NODE，否则 Electron 会退化成纯 Node 进程，GUI 起不来
//   2. Electron 追加 --no-sandbox，否则 Chromium 沙箱初始化失败（进程直接退出）
//   3. 把 app 数据目录（~/.dev-sidecar）重定向到工作区内，否则 Electron 无权写
const SANDBOX_HOME   = process.env.DEV_SIDECAR_SANDBOX_HOME
  || path.resolve(REPO_ROOT, '..', 'ds-home');
const CONFIG_FILES   = [
  'config.json', 'remote_config.json5', 'remote_config_personal.json5',
  'setting.json', 'automaticCompatibleConfig.json', 'pac.txt',
  'domestic-domain-allowlist.txt', 'dev-sidecar.ca.crt', 'dev-sidecar.ca.key.pem',
];

function applySandboxCompat() {
  if (process.env.DEV_SIDECAR_NO_SANDBOX_COMPAT === '1') return;
  if (process.env.DSH_SHELL !== '1' && !process.env.DEV_SIDECAR_SANDBOX_HOME) return;

  delete process.env.ELECTRON_RUN_AS_NODE;

  const appDir = path.join(SANDBOX_HOME, '.dev-sidecar');
  const dirs = [
    appDir,
    path.join(SANDBOX_HOME, 'AppData', 'Roaming'),
    path.join(SANDBOX_HOME, 'AppData', 'Local'),
    path.join(SANDBOX_HOME, 'Temp'),
    path.join(SANDBOX_HOME, 'electron-udd'),
  ];
  for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });

  // 首次运行时从真实用户目录拷贝配置与证书，保证代理规则与根证书可用
  const realHome = process.env.USERPROFILE || process.env.HOME || '';
  if (realHome && path.resolve(realHome) !== path.resolve(SANDBOX_HOME)) {
    const realDir = path.join(realHome, '.dev-sidecar');
    for (const name of CONFIG_FILES) {
      const src = path.join(realDir, name);
      const dest = path.join(appDir, name);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        try { fs.copyFileSync(src, dest); } catch { /* 忽略单个文件拷贝失败 */ }
      }
    }
  }

  process.env.USERPROFILE  = SANDBOX_HOME;
  process.env.APPDATA      = path.join(SANDBOX_HOME, 'AppData', 'Roaming');
  process.env.LOCALAPPDATA = path.join(SANDBOX_HOME, 'AppData', 'Local');
  process.env.TEMP         = path.join(SANDBOX_HOME, 'Temp');
  process.env.TMP          = process.env.TEMP;
  // 允许外部追加参数（如 --remote-debugging-port=9222，便于自动化调试 GUI）
  const extraArgs = process.env.DEV_SIDECAR_ELECTRON_ARGS_EXTRA || '';
  process.env.DEV_SIDECAR_ELECTRON_ARGS =
    `--no-sandbox --user-data-dir=${path.join(SANDBOX_HOME, 'electron-udd')} ${extraArgs}`.trim();

  log('== 已启用受限环境适配 ==');
  log(`   数据目录: ${appDir}`);
  log(`   Electron 参数: ${process.env.DEV_SIDECAR_ELECTRON_ARGS}`);
  log('');
}

// ── 工具函数 ──────────────────────────────────────────────────
const log = (msg) => console.log(msg);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getNodePath() {
  try {
    return IS_WIN
      ? execSync('where node', { encoding: 'utf8' }).trim().split(/\r?\n/)[0]
      : execSync('which node', { encoding: 'utf8' }).trim();
  } catch {
    console.error('node 未找到，请确认已安装 Node.js 并加入 PATH');
    process.exit(1);
  }
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => { server.close(); resolve(false); });
    server.listen(port, '127.0.0.1');
  });
}

function getListeners(targetPorts) {
  try {
    const out = execSync(
      IS_WIN
        ? 'chcp 65001 >nul && netstat -ano -p tcp'
        : "ss -Htlnp 2>/dev/null || netstat -tlnp 2>/dev/null",
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    return out.split(/\r?\n/).reduce((list, line) => {
      const parts = line.trim().split(/\s+/);
      let localAddr, state, pid;

      if (IS_WIN) {
        // netstat -ano 的列顺序为: 协议 本地地址 外部地址 状态 PID
        const m = line.trim().match(/^TCP\s+(\S+)\s+\S+\s+LISTENING\s+(\d+)$/);
        if (!m) return list;
        localAddr = m[1];
        state = 'LISTENING';
        pid = m[2];
      } else {
        if (parts.length >= 6) {
          localAddr = parts[3]; state = parts[0]; pid = parts[5].split('/')[0];
        } else if (parts.length >= 7) {
          localAddr = parts[3]; state = parts[5]; pid = parts[6].split('/')[0];
        } else return list;
        if (state !== 'LISTEN' && state !== 'LISTENING') return list;
      }

      const portStr = localAddr.replace(/.*:(\d+)$/, '$1');
      const port = parseInt(portStr, 10);
      if (targetPorts.includes(port) && pid && pid !== '-') {
        list.push({ address: localAddr, port, pid: parseInt(pid, 10) });
      }
      return list;
    }, []);
  } catch {
    return [];
  }
}

function getProcessName(pid) {
  try {
    if (!IS_WIN) {
      return execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    }
    // 新版 Windows 已移除 wmic，优先用 tasklist
    const csv = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return csv.split('","')[0].replace(/^"/, '') || '-';
  } catch { return '-'; }
}

// ── 业务函数 ──────────────────────────────────────────────────
function showStatus(title) {
  log(`== ${title} ==`);
  const listeners = getListeners(PORTS)
    .sort((a, b) => a.port - b.port);
  if (listeners.length) {
    listeners.forEach(({ address, pid }) => {
      const name = getProcessName(pid);
      log(`  ${address.padEnd(24)} PID ${String(pid).padEnd(7)} ${name}`);
    });
  } else {
    log('  no listeners');
  }
  log('');
}

async function stopProcesses() {
  log('== stopping dev-sidecar ==');
  const listeners = getListeners(PORTS);
  const pids = [...new Set(listeners.map((l) => l.pid))];

  if (!pids.length) { log('  no listeners\n'); return; }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      log(`  killed PID ${pid}`);
    } catch {
      if (IS_WIN) {
        spawnSync('cmd', ['/c', 'taskkill', '/F', '/PID', String(pid), '/T'],
          { stdio: 'ignore', windowsHide: true });
        log(`  killed PID ${pid}`);
      }
    }
  }

  // 等待端口释放（最多 5 秒）
  for (let i = 0; i < 10; i++) {
    if (!(await isPortInUse(PORTS[0]))) break;
    await sleep(500);
  }
  log('');
}

async function startServer(devPort) {
  const node = getNodePath();

  if (FOREGROUND) {
    log('== starting dev-sidecar in foreground (Ctrl+C to stop) ==');
    const child = spawn(node, [ELECTRON_DEV, '--port', String(devPort)],
      { cwd: GUI_DIR, stdio: 'inherit' });

    if (!IS_WIN) {
      process.on('SIGINT', () => { child.kill('SIGINT'); });
      process.on('SIGTERM', () => { child.kill('SIGTERM'); });
    }
    child.on('exit', (code) => process.exit(code ?? 0));
    return;
  }

  log('== starting dev-sidecar ==');
  const child = spawn(node, [ELECTRON_DEV, '--port', String(devPort)], {
    cwd: GUI_DIR,
    detached: true,
    stdio: 'ignore',
    ...(IS_WIN && { windowsHide: true }),
  });
  child.unref();
  log(`  launcher PID: ${child.pid}`);

  await waitPorts(PORTS);
  showStatus('port status after start');
}

async function waitPorts(ports, timeoutSec = TIMEOUT_SEC) {
  const deadline = Date.now() + timeoutSec * 1000;
  const ready = new Set();

  while (Date.now() < deadline) {
    for (const port of ports) {
      if (ready.has(port)) continue;

      // 以 netstat 的监听列表为准：Windows 上 SO_REUSEADDR 允许重复绑定，
      // isPortInUse() 对已被占用的端口可能返回 false（如 webpack-dev-server 的 8081）
      const listeners = getListeners([port]);
      if (listeners.length) ready.add(port);
    }
    if (ready.size >= ports.length) break;
    await sleep(1000);
  }

  if (ready.size < ports.length) {
    const missing = ports.filter((p) => !ready.has(p));
    log(`等待端口超时，未就绪端口: ${missing.join(', ')}`);
  } else {
    log(`端口已全部就绪: ${ports.join(', ')}`);
  }
}

// ── 主流程 ────────────────────────────────────────────────────
(async () => {
  applySandboxCompat();

  switch (ACTION) {
    case 'check':
      showStatus(`port status (dev: ${DEV_PORT}, http proxy: ${PROXY_HTTP}, https proxy: ${PROXY_HTTPS})`);
      break;

    case 'stop':
      await stopProcesses();
      showStatus('port status after stop');
      break;

    case 'start':
      if (!SKIP_KILL) await stopProcesses();
      await startServer(DEV_PORT);
      break;

    case 'restart':
      await stopProcesses();
      await startServer(DEV_PORT);
      break;

    default:
      console.error(`未知 action: ${ACTION}`);
      process.exit(1);
  }
})();