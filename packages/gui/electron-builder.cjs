// electron-builder 的默认配置文件名之一。`install-app-deps` 这类子命令不接受 --config，
// 只会按默认名（electron-builder.cjs / .yml / .json ...）查找配置；找不到就读 package.json
// 里的 electron 声明。hoisted 布局下 electron 被提升到仓库根，builder 在 packages/gui 下
// 推断不到版本，而 devDependencies 写的是 "^42.11.16" 范围值，于是 install-app-deps 直接失败。
// 这里转发到真正的配置文件，让它能读到 electronVersion。
module.exports = require('./electron-builder.config.cjs')
