/**
 * SEA（单文件可执行程序）相关的小工具。
 *
 * 在 SEA 里 `fork('<某个 .js 路径>')` 是不成立的：Node 会用当前可执行文件替换掉脚本参数，
 * 于是子进程把那个路径当成命令（实测表现为「未知命令: <目录>/proxy-worker.js」，退出码 1）。
 * 因此需要子进程时一律用 `spawn(process.execPath, [...args])` 重新执行自身，
 * 由入口里的隐藏命令在同进程内加载对应模块（见 sea-entry.js 的 `__worker:*` 分支）。
 */
const { spawn } = require('node:child_process')

/** 是否运行在单文件可执行程序里；老运行时没有 node:sea 时返回 false */
function isSea () {
  try {
    return require('node:sea').isSea()
  } catch {
    return false
  }
}

/**
 * 重新执行本可执行文件。
 * SEA 下 process.execPath 就是程序本身；普通 node 下则是 node 自身。
 *
 * @param {string[]} args
 * @param {object} [options] 传给 spawn 的其它选项
 */
function spawnSelf (args, options = {}) {
  // SEA 下 execPath 就是本程序自身，直接透传参数；普通 node 下必须把脚本路径补回去，
  // 否则会变成 `node __worker:proxy on` 这种把参数当文件名的调用。
  const argv = isSea() ? args : [__filename, ...args]
  return spawn(process.execPath, argv, { stdio: 'inherit', ...options })
}

module.exports = { isSea, spawnSelf }
