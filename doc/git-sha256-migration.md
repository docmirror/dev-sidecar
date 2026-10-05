# Git SHA-256 迁移注意事项

> 结论先说：**dev-sidecar 与它的核心子模块必须同时迁移，绝不能只迁一边。**

## 背景

Git 正在为 **Git 3.0 默认使用 SHA-256** 做准备（[Git 2.51-rc0](https://www.phoronix.com/news/Git-2.51-rc0)
已包含一批铺垫）。SHA-256 仓库自 Git 2.29 起可用 `git init --object-format=sha256` 显式创建，
但**逐仓库 opt-in，没有既定的一刀切日期**；截至 2026 年中，**GitHub 仍只托管 SHA-1 仓库**。
所以现在无需做任何事，但迁移到来时下面两点必须遵守。

## 1. 主仓库与子模块必须同时迁移（最重要）

本仓库通过 git submodule 引用核心代码：

- `vendor/ds-core` → 子模块；`packages/core`、`packages/mitmproxy` 是指向它的软链
- `packages/cli` 的 SEA 构建同样依赖这份核心

**SHA-1 超级项目引用 SHA-256 子模块（或反过来）是 object-format 迁移里已知的薄弱环节**：
gitlink 的读写与兼容层翻译在混合哈希格式下并不完整，可能出现指针无法解析、
`git submodule update` 失败、CI 拉取异常等问题。

因此：

- ❌ 不要只迁 `dev-sidecar`，也不要只迁 `ds-core`
- ✅ 要么都保持 SHA-1，要么**两个一起迁到 SHA-256**（并在同一次 CI 切换里完成）
- 迁移前先确认代码托管方已支持该格式（截至 2026 年中，GitHub 仍只支持 SHA-1）

## 2. 不要假设哈希是 40 位

SHA-1 是 40 位十六进制，SHA-256 是 64 位。当前仓库扫描结果是**没有硬编码长度假设**
（无 `{40}`、`slice(0, 40)`、裸 `sha1`），请保持这一点：

- 取短哈希用 `git rev-parse --short`（与格式无关）；但注意 **`--short=N` 在发生歧义时会自动变长**，
  需要严格定宽就自己截取前缀
- 本地打包的版本号指纹（`packages/gui/scripts/local-build-version.mjs`）已规避该问题：
  它把主仓库与各子模块的 tree OID 一起再做一次 sha256 并固定取 7 位，
  因此**无论仓库是 SHA-1 还是 SHA-256，版本号格式完全一致**

## 3. 迁移对本地版本号的影响（属预期行为）

迁移会让所有 tree OID 改变，于是本地 dev 包版本号（`<base>-dev.<指纹>`）随之变化。
这是预期行为：dev 版本号表达的是「内容身份」，不是长期存档标识 ——
需要长期对照请用 commit，或把 `git diff HEAD` 存成 patch 附在产物旁边。