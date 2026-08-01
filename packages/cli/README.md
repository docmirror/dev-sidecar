# @docmirror/dev-sidecar-cli

开发者边车（Dev Sidecar）命令行版本，为 GitHub、npm、Docker Hub 等境外站点提供加速代理。

## 安装

```bash
npm install -g @docmirror/dev-sidecar-cli
```

## 开发

### 环境要求

- Node.js >= 18
- pnpm >= 9

### 依赖安装

在仓库根目录执行，安装 CLI 及其依赖（core、mitmproxy），不包含 GUI：

```bash
pnpm install --filter @docmirror/dev-sidecar-cli...
```

### 运行

```bash
node packages/cli/cli.js
```

### 测试

```bash
# 运行 CLI 测试
pnpm --filter @docmirror/dev-sidecar-cli test

# 运行测试并查看覆盖率
npx nyc --reporter=text pnpm --filter @docmirror/dev-sidecar-cli test

# 运行全部包的测试
pnpm --filter @docmirror/dev-sidecar test
pnpm --filter @docmirror/mitmproxy test
```

### 项目结构

```
packages/cli/
├── cli.js                    # bin 入口，路由到 src/index.js
├── sea-config.json           # SEA 打包配置
├── scripts/
│   └── build.js              # SEA 打包脚本（支持 --all 交叉编译）
├── src/
│   ├── index.js              # 主入口，命令路由 + 守护进程模式
│   ├── sea-entry.js          # SEA 入口，同进程启动代理
│   ├── banner.txt            # ASCII art banner
│   ├── mitmproxy.js          # fork 模式的代理入口
│   ├── plugin-worker.js      # 插件操作临时子进程
│   ├── free-eye-worker.js    # free_eye 测试临时子进程
│   └── commands/
│       ├── start.js          # start 逻辑 + PID/端口/GUI 检测
│       ├── stop.js           # stop 逻辑
│       ├── restart.js        # restart 逻辑
│       ├── status.js         # status 逻辑
│       ├── plugin.js         # plugin 命令路由 + overwall 解锁检测
│       ├── service.js        # 开机自启动 (systemd/launchd/注册表)
│       └── gui.js            # GUI 启停 + 端口检测
└── test/
    ├── start.test.js         # 端口检测、配置读取、PID 逻辑测试
    ├── plugin.test.js        # 插件列表、overwall 解锁测试
    ├── status.test.js        # 状态格式化、文件逻辑测试
    ├── gui.test.js           # 端口检测、GUI 检测测试
    ├── service.test.js       # 开机自启动测试
    └── index.test.js         # 命令路由、help、version 测试
```

### 添加新命令

1. 在 `src/commands/` 下创建 `<command>.js`
2. 在 `src/index.js` 的 `routeCommand()` switch 中添加 case
3. 在 `test/` 下创建对应测试文件

### 添加新插件

插件列表从 core 的 `src/modules/plugin/index.js` 动态读取，CLI 无需修改。如果插件有特殊行为（如 `free_eye` 的一次性测试），在 `src/commands/plugin.js` 中添加分支处理。

## 命令

```bash
ds-cli                        # 启动 CLI 守护进程（默认）
ds-cli start                  # 启动 CLI 守护进程
ds-cli stop                   # 停止 CLI 守护进程
ds-cli restart                # 重启 CLI 守护进程
ds-cli status                 # 显示 CLI 运行状态
ds-cli version                # 显示版本号
ds-cli plugin start <name>    # 启动单个插件
ds-cli plugin stop <name>     # 停止单个插件
ds-cli service install        # 注册开机自启动
ds-cli service uninstall      # 移除开机自启动
```

### GUI 操作参数

通过 `--gui` 或 `--all` 参数控制操作对象：

```bash
ds-cli start --gui            # 仅启动 GUI
ds-cli start --all            # 同时启动 CLI 和 GUI
ds-cli stop --gui             # 仅停止 GUI
ds-cli stop --all             # 同时停止 CLI 和 GUI
ds-cli restart --gui          # 仅重启 GUI
ds-cli restart --all          # 同时重启 CLI 和 GUI
ds-cli status                 # 显示状态（自动包含 GUI 状态）
```

### 启动

```bash
ds-cli
```

启动后进程在后台运行，终端立即返回：

```
dev-sidecar 已在后台启动，PID: 12345
```

### 停止

```bash
ds-cli stop
```

### 查看状态

```bash
ds-cli status
```

输出示例：

```
dev-sidecar 运行状态:
  代理服务:  运行中
  系统代理:  已开启
  开机启动:  已注册
  GUI:       未运行
  插件:
    git       已启用
    node      已启用
    pip       已启用
    free_eye  未启用
```

### 插件管理

```bash
ds-cli plugin start git       # 启动 git 加速
ds-cli plugin stop git        # 停止 git 加速
```

支持的插件及行为：

| 插件 | start | stop | 说明 |
|------|-------|------|------|
| `git` | 设置 git 全局代理 | 清除 git 全局代理 | 持久开关，重启终端后仍生效 |
| `node` | 设置 npm 代理和 registry | 清除 npm 代理 | 持久开关 |
| `pip` | 设置 pip 代理 | 清除 pip 代理 | 持久开关 |
| `free_eye` | 运行一次性测试并输出结果 | 不适用 | 无持久开关状态，`stop` 命令会提示不适用 |

`free_eye` 启动时输出示例：

```
正在运行 free_eye 测试...

=== free_eye 测试结果 ===
完成时间: 2025-07-25T14:00:00.000Z
总测试数: 10
已完成:   10

摘要:
  PASS example.com - 响应正常
  PASS github.com - 连接成功
```

### 开机自启动

```bash
ds-cli service install        # 注册开机自启动
ds-cli service uninstall      # 移除
```

各平台实现：

| 平台 | 机制 | 说明 |
|------|------|------|
| Linux | systemd user service | 自动重启崩溃进程，`systemctl --user` 管理 |
| macOS | launchd | `~/Library/LaunchAgents/com.dev-sidecar.cli.plist` |
| Windows | 注册表 Run 键 | `HKCU\...\Run`，不依赖 Task Scheduler |

## 启动流程

执行 `ds-cli`（或 `ds-cli start`）后：

1. 检查实例锁（`~/.dev-sidecar/dev-sidecar.lock`）判断 CLI/GUI 是否已运行，若已运行则提示并退出
2. 若无冲突，fork 一个 detached 子进程作为守护进程，父进程写入 PID 文件后立即退出，终端恢复控制权
3. 守护进程启动：
   - 获取实例锁，防止 CLI/GUI 重复运行
   - 从 `~/.dev-sidecar/config.json` 加载用户配置（与 GUI 版共享）
   - 启动 mitmproxy 代理服务器（默认端口 31180 HTTP / 31181 HTTPS）
   - 设置系统代理
   - 启动已启用的插件（git、node、pip 等）
   - 通过代理下载远程加速规则配置
   - 运行状态（代理服务、系统代理、插件开关）事件驱动写入 `~/.dev-sidecar/running.json`（app.status 字段）
4. 守护进程监听 SIGINT / SIGTERM / exit 信号，收到后恢复系统代理并清理文件

## 其他命令

```bash
ds-cli stop                       # 读取 PID 文件，发送 SIGINT，等待进程退出后清理
ds-cli restart                    # 停止当前守护进程后重新启动
ds-cli status                     # 通过实例锁判断运行状态，读取 running.json 显示代理、系统代理、插件状态
ds-cli plugin start <name>        # fork 临时子进程启动指定插件后退出
ds-cli plugin stop <name>         # fork 临时子进程停止指定插件后退出
```

## 配置文件

- `~/.dev-sidecar/config.json` — 用户配置（与 GUI 版共享）
- `~/.dev-sidecar/remote_config.json5` — 远程共享规则（自动下载）
- `~/.dev-sidecar/remote_config_personal.json5` — 远程个人规则（自动下载）
- `~/.dev-sidecar/setting.json` — 软件设置（含 overwall 解锁标记）
- `~/.dev-sidecar/ds-cli.pid` — 守护进程 PID 文件
- `~/.dev-sidecar/dev-sidecar.lock` — 实例互斥锁（proper-lockfile，异常退出由 stale 机制自动接管）
- `~/.dev-sidecar/running.json` — mitmproxy 子进程启动配置 + 实例信息（app.instance）+ 运行时状态（app.status）

## 日志

日志写入 `~/.dev-sidecar/logs/core.log`，按日期轮转，支持压缩。

## 构建打包

CLI 使用 Node.js SEA（Single Executable Applications）打包为单个可执行文件。

### 一键打包

```bash
# 打包本机平台（自动识别）
node packages/cli/scripts/build.js

# 打包所有平台（交叉编译）
node packages/cli/scripts/build.js --all
```

脚本自动完成：esbuild 打包 → SEA blob 生成 → 下载 Node.js 二进制 → 注入 blob → 验证。

### 输出产物

打包完成后在 `packages/cli/dist/` 下生成：

| 命令 | 产物 |
|------|------|
| `node scripts/build.js` | `ds-cli-<version>-<本机平台>` |
| `node scripts/build.js --all` | 5 个平台的二进制 |

支持的平台：`linux-x64`、`linux-arm64`、`macos-x64`、`macos-arm64`、`windows-x64`。

### 自动构建（CI）

推送到 `release*` 分支或 `v*` 标签时，GitHub Actions 自动构建所有平台。打 `v*` 标签时自动创建 GitHub Release（draft 模式）。

## 测试

```bash
pnpm --filter @docmirror/dev-sidecar-cli test
```

测试覆盖率（nyc）：

| 文件 | 语句覆盖 | 分支覆盖 | 函数覆盖 | 行覆盖 |
|------|---------|---------|---------|--------|
| `start.js` | 40.57% | 26.08% | 66.66% | 38.09% |
| `gui.js` | 30.26% | 16.12% | 46.15% | 27.14% |
| **总计** | **35.17%** | **20.37%** | **56.00%** | **32.33%** |

已覆盖：端口检测、配置读取、PID 文件逻辑、插件列表、overwall 解锁检测、状态格式化、命令路由解析。

未覆盖（需集成测试环境）：`startDaemon`、`stopDaemon`、`restartDaemon`、`startGui`、`stopGui`、`restartGui` 等涉及 fork 子进程和外部命令的函数。

## 许可证

MPL-2.0
