// electron 41 + ESM 兼容桥
// 问题：在 ESM 主进程文件里 `import ... from 'electron'` 会被 Node 的 ESM 解析器
// 定位到 npm 包 node_modules/electron 的 index.js —— 它只返回二进制路径字符串/空壳，
// 拿不到真实的 electron API（app / BrowserWindow / ipcMain …）。
// 只有通过 CJS 的 require('electron')，electron 运行时才会注入真实的内置模块。
// 因此这里用 createRequire 取 CJS 通道，再默认导出，供所有主进程 ESM 文件复用。
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electron = require('electron')

export default electron
