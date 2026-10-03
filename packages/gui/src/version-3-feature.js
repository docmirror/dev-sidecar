/**
 * 3.0.0 未发布功能总开关（P2P 统一加速 / 节点分享 + 设置页「历史日志」迁移/脱敏）。
 *
 * 这些功能尚未正式发布，计划在【下下个版本】开放。
 * 在本版本中，即使本机 setting.json 已解锁「增强模式」，界面也不暴露以下入口：
 *   1. 侧边栏「应用 → 统一加速」菜单项（view/router/menu.js）
 *   2. 首页「P2P节点分享」开关（view/pages/index.vue）
 *   3. 系统托盘「P2P节点分享」勾选项（background.js）
 *   4. 设置页「历史日志」区块（迁移到 3.0.0 / 一键脱敏）（view/pages/setting.vue）
 *
 * 底层实现保持完好，仅隐藏 UI 入口，便于随时恢复：
 *   - 插件：core/src/modules/plugin/share
 *   - 页面：view/pages/plugin/p2p.vue
 *   - 路由：/plugin/p2p
 *
 * 正式发布时把 VERSION_3_FEATURE_ENABLED 改为 true 即可恢复全部入口。
 */
export const VERSION_3_FEATURE_ENABLED = false
