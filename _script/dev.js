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

const { execSync, spawn, spawnSync } = require('child_process');
const net = require('net');
const path = require('path');

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
        [localAddr, , state, pid] = parts;
        if (state !== 'LISTENING') return list;
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
    return IS_WIN
      ? execSync(
          `wmic process where "ProcessId=${pid}" get Name /value`,
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).match(/Name=(.+)/)?.[1]?.trim() || '-'
      : execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { return '-'; }
}

// ── 业务函数 ──────────────────────────────────────────────────
function showStatus(title) {
  log(`== ${title} ==`);
  const listeners = getListeners(PORTS)
    .sort((a, b) => a.port - b.port);
  if (listeners.length) {
    listeners.forEach(({ address, port, pid }) => {
      const name = getProcessName(pid);
      log(`  ${address}:${String(port).padEnd(6)} PID ${String(pid).padEnd(7)} ${name}`);
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
      if (!(await isPortInUse(port))) continue;

      // 双重确认：端口在用 且 netstat 能找到监听者
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