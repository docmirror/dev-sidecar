# DevSidecar 迁移到 Tauri 2.0 + 移动端支持可行性评估

> 对议题「将 DevSidecar 迁移到 Tauri 2.0 + EasyTier 内核，实现 Android / iOS 支持」的技术与成本评审结论。

## 结论（是否接受）

- **接受方向**：支持探索 Tauri 2.0 + Rust 内核，目标覆盖移动端。
- **不接受当前“一次性整体迁移、2-3 周完成”的实施假设**：现有代码耦合度与移动端约束决定该估算偏乐观。
- **建议按阶段立项**：先做最小可行版本（MVP），再决定是否全面替换 Electron。

## 可行性审查

### 1) 前端复用：可行，但不是零成本

- GUI 侧已是 Vue 3（`packages/gui/package.json`），具备复用基础。
- 但主进程仍深度绑定 Electron（`packages/gui/src/background.js`），窗口、托盘、IPC、更新等能力需重写到 Tauri 命令与插件体系。

### 2) MITM 核心迁移：可行，但需重构边界

- 现有核心是 Node.js 进程模型（`packages/mitmproxy/src/index.js`、`packages/core/src/index.js`），与 `process`、子进程通信、Node 生态能力耦合明显。
- Rust MITM 生态可支撑重建（如议题中提到的 slinger-mitm / hudsucker），但本质是**重实现**，不是平移。

### 3) EasyTier 定位：可作为补充，不是替代

- 该方向判断合理：EasyTier 更偏 VPN/组网，不直接提供 DevSidecar 所需的 HTTPS MITM 解密与规则重写能力。
- 适合作为移动端网络接管能力的候选组件，而非主代理内核替身。

## 成本评估（修正）

原估算 **2-3 周** 对“桌面迁移 + Android + iOS + MITM 重构”整体范围偏低。建议拆分：

1. **阶段 A：架构解耦与 Rust MITM POC（2-4 周）**
   - 抽离规则引擎接口（域名匹配、Host/SNI/URL 改写）
   - Rust 内核验证：证书生成、TLS 解密、基础拦截
2. **阶段 B：桌面端 Tauri 替换（2-4 周）**
   - 保持现有功能等价（系统代理、证书安装、更新、日志）
3. **阶段 C：移动端 MVP（3-6 周）**
   - Android 优先：系统 VPN 模式 + GitHub 加速核心规则
   - iOS 视签名与 Network Extension 资源情况并行推进

> 合计建议：**7-14 周**（按阶段验收，可随阶段成果提前止损或继续）。

## 建议的接受条件（Gate）

满足以下条件后，建议继续全面迁移：

1. Rust MITM POC 在桌面端完成稳定验证（证书、拦截、规则命中）。
2. 新旧内核可并行切换，回滚路径明确。
3. 移动端先聚焦 GitHub 加速核心能力，不追求首版功能全量对齐。
4. iOS 签名/分发与合规资源（Apple Developer、NE 权限）已确认。

---

**最终判断**：该提案方向值得接受，但应以“分阶段里程碑 + MVP 优先 + 风险闸门”执行；不建议按当前一次性范围直接承诺 2-3 周交付。
