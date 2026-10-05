# 远程配置拉取安全分析

> 范围：仅分析 ds 内核如何下载并应用「远程配置」（`app.remoteConfig`），不涉及代理对上游站点的出站连接。
> 性质：只读审计 + 整改设计。
> 更新：第 5 节的 **P0（强制 https）已于 2026-10-04 实施**；P1 签名校验仍未做。

## 1. 涉及文件

| 文件 | 角色 |
|---|---|
| `vendor/ds-core/core/src/config-api.js` | 远程配置下载入口（`startAutoDownloadRemoteConfig` / `downloadRemoteConfig` / `doDownloadRemoteConfig`）、HTTPS 改写持久化（`persistRemoteConfigUrlHttps`） |
| `vendor/ds-core/core/src/config/index.js` | 默认/历史 URL 常量、`applyRemoteConfigUrlFix` |
| `vendor/ds-core/core/src/config/remote-config-url.js` | 强制 https：`isPlainHttpUrl` / `toHttpsUrl` / `applyRemoteConfigUrlHttps` |
| `vendor/ds-core/core/src/config/local-config-loader.js` | 从 `~/.dev-sidecar/remote_config*.json5` 读取并合并 |
| `vendor/ds-core/core/src/config/remote_config.json5` | 内置样例远程配置（随包发布） |
| `packages/gui/src/view/pages/setting.vue` | 设置页「远程配置」说明：明确不再支持裸 HTTP |

## 2. 当前拉取流程

1. 启动或每天一次（`setInterval` 24h）触发 `startAutoDownloadRemoteConfig`。
2. `downloadRemoteConfig()` 读取 `get().app.remoteConfig`（含 `url` 与 `personalUrl`）。
3. `doDownloadRemoteConfig(url)` 用 `request(url, { headers, proxy: null }, cb)` 下载：
   - `proxy: null` → 不走 ds 自身代理、也不走环境变量代理，直连目标，避免启动期本地代理未监听导致 `ECONNREFUSED 127.0.0.1:31181`。
   - 对 `https://raw.githubusercontent.com/` 额外加 `Server-Name: baidu.com` 头（GFW 规避的域名前置技巧），官方地址不走此逻辑。
4. 下载成功（`statusCode === 200` 且 body 长度 ≥ 2）→ `jsonApi.parse` 解析 → 与本地已存内容比对，有变化才写盘 `~/.dev-sidecar/remote_config.json5`（`_personal` 为个人配置）。
5. 有更新则 `reload()`，经 `getConfigFromFiles` 合并进 `configTarget`。

合并优先级（`local-config-loader.js:93-104`）：

```
personal → share → default → share → personal → user
```

即远程配置（个人 + 共享）几乎凌驾于内置默认之上，仅用户显式 `config.json` 可覆盖。

## 3. 威胁模型

| 攻击者能力 | 能否投毒远程配置 |
|---|---|
| 公共 WiFi / 运营商注入（无合法证书） | 否（TLS 校验拦截） |
| 本地 ARP 欺骗（无合法证书） | 否（同上） |
| 流氓/被胁迫 CA 签发 `ds-official-config.bestar.de5.net` 合法证书 | **能** |
| DNS 劫持到攻击者持有合法证书的服务器 | **能** |
| 篡改 ds 发布包本身（替换信任锚） | 能，但门槛更高 |
| 用户/已污染 config 把 `url` 改成 `http://` | 否（2026-10-04 起自动改写为 https） |
| 投毒后效果 | 改写拦截/重定向规则、DNS 服务商与预设 IP、ECH 域名、脚本注入开关 → 等同接管被代理流量 |

## 4. 现状评估

### 4.1 HTTP 降级 —— 不会主动降级，但不强制 https
- 默认地址 `https://ds-official-config.bestar.de5.net/remote_config.json5`（`index.js:22`）。
- 16 条历史废弃地址**全部 `https://`**（`index.js:25-51`），无一条 `http://`，且无 `https→http` 回退代码。
- ✅ 已修复（2026-10-04）：`app.remoteConfig.url` / `personalUrl` 虽是用户可配字段，但 `applyRemoteConfigUrlFix` 在**合并之后**统一把 `http://` 改写为 `https://`（`remote-config-url.js`），并由 `config-api.js` 的 `persistRemoteConfigUrlHttps` 写回 `config.json`（幂等）。因此用户或已被污染的 config 设为 `http://xxx` 也会被改成 https，不再明文下载。GUI 设置页已注明「不再支持裸 HTTP」。
- 小隐患：`request` 默认跟随 3xx 且未限制协议，若服务端返回 `Location: http://...` 会跟过去走明文（需攻击者已能控制 https 响应，利用价值低）。

### 4.2 MITM / TLS —— 普通网络 MITM 防得住
- `request` 调用未传 `rejectUnauthorized`/`agent`，Node 默认开启证书校验 → 无合法证书的被动 MITM 被拒 ✓。
- **信任库隔离**：主进程**未设置** `NODE_EXTRA_CA_CERTS` 指向 ds 自签 CA（该变量只用于 node 插件子进程 `node/index.js:226`）。ds 自家 CA 不参与主进程出站校验，也不会「自己 MITM 自己」。
- `NODE_TLS_REJECT_UNAUTHORIZED`：`server.setting` 默认 `true`（`index.js:107`）；`mitmproxy/src/index.js:32` 仅在用户显式开启 `setting.NODE_TLS_REJECT_UNAUTHORIZED===false` 时置 `'0'`，且仅作用于**代理对上游站点**的出站连接，**不作用于远程配置拉取**。

### 4.3 内容完整性 —— ❌ 无任何校验
下载后仅 `jsonApi.parse` + 落盘，**无签名、无哈希、无 MAC、无证书固定（cert pinning）**。安全边界完全等于标准 Web PKI（TLS + DNS + 公共 CA）。一旦攻击者拿到该域名的合法证书，即可投毒。

### 4.4 放大项
内置样例 `core/src/config/remote_config.json5:11` 含 `"rejectUnauthorized": false`，说明远程配置本身就能放宽代理对上游的 TLS 校验——「远程配置可削弱安全」是同一攻击面的倍增器。

## 5. 整改建议（按优先级）

| 优先级 | 措施 | 效果 |
|---|---|---|
| P0 | 拉取前断言 `remoteConfigUrl.startsWith('https://')`，否则拒绝/告警 | 杜绝明文 http 拉取。**已实施（2026-10-04）**：采用「自动改写为 https + 写回用户配置」而非直接拒绝，避免用户自建 http 地址直接失效 |
| P1 | **非对称签名校验**（见第 6 节） | 即使攻击者拿到合法证书也无法伪造配置 |
| P2 | `request` 显式 `strictSSL: true` + 重定向限制为同协议 | 收口边角降级路径 |
| P2 | 评估内置样例 `rejectUnauthorized:false` 是否必要 | 避免默认放开上游校验 |

## 6. 签名校验设计（P1）

### 6.1 为什么是非对称，而不是 HMAC
- HMAC 需要客户端持有**对称密钥**，而密钥写在客户端二进制里可被提取还原，等同于没有。
- 非对称（ed25519）只需把**公钥**烤进客户端，私钥只在发布端。攻击者拿到服务器、甚至拿到合法 TLS 证书，也签不出客户端会接受的配置。

### 6.2 密钥体系
- 发布端持有 ed25519 私钥；客户端内置一组**可信公钥**（支持多 key 以便轮转）。
- 公钥以 `kid -> base64` 形式硬编码在源码常量里（信任锚 = 「首次代码信任」）。

### 6.3 签名对象与算法
- 对配置的**原始字节**做 `SHA-256`，再用 ed25519 私钥签名（ed25519 内部用 SHA-512，无需单独指定哈希算法）。
- 直接签原始字节，避免 JSON 规范化（canonicalization）带来的坑。

### 6.4 签名传递方式
- 推荐**独立 sidecar 文件** `remote_config.json5.sig`，内容为：
  ```json
  { "kid": "ds1", "alg": "ed25519", "sig": "<base64 签名>" }
  ```
- 与配置文件并列发布；客户端两个文件并行下载。比 HTTP 头更抗 CDN/代理改写。

### 6.5 校验位置与失败处理
- 在 `doDownloadRemoteConfig` 内、写盘与 `reload()` **之前**校验。
- 校验失败 → 记录错误、**拒绝保存、拒绝 reload**（保留上次成功落盘的「已知良好」配置，fail-safe）。

### 6.6 公钥轮转
- 客户端内置一个**小公钥列表**（如 `ds1`、`ds2`）。
- 发布端用当前私钥签名并带 `kid`；客户端只接受 `kid` 在可信列表内且验签通过的配置。
- 轮转时先在全量客户端覆盖新 key 后再停用旧 key。

### 6.7 个人配置豁免
- 仅对**官方共享配置**（`url`）强制验签；`personalUrl` 是用户自己的配置，不在范围内（用户自行承担）。
- 对 `url` 仍先做 P0 的 https 强制，再验签。

### 6.8 上线兼容
- 服务端开始发布 `.sig` 的同时继续提供纯文本配置；不验签的旧客户端忽略 `.sig`，照常工作 → 平滑过渡。
- 过渡期可对「缺 `.sig`」采用**软失败（仅告警）**；功能全量上线后对官方 `url` 改为**硬失败（拒绝更新）**。

### 6.9 参考实现

发布端（签名，Node `crypto`）：
```js
const crypto = require('node:crypto')
const fs = require('node:fs')

const privateKey = crypto.createPrivateKey(fs.readFileSync('ds1-ed25519.key.pem'))
const body = fs.readFileSync('remote_config.json5')           // 原始字节
const sig = crypto.sign(null, body, privateKey)               // ed25519
fs.writeFileSync('remote_config.json5.sig',
  JSON.stringify({ kid: 'ds1', alg: 'ed25519', sig: sig.toString('base64') }))
```

客户端（验签，`core/src/config/remote-config-signing.js`）：
```js
const crypto = require('node:crypto')

// 信任锚：烤进客户端的可信公钥（支持多 key 轮转）
const TRUSTED_KEYS = {
  ds1: '<base64-der-or-pem-public-key>',
}

function verifyRemoteConfig (bodyBytes, sigB64, kid) {
  const pub = TRUSTED_KEYS[kid]
  if (!pub) return false
  const sig = Buffer.from(sigB64, 'base64')
  try {
    return crypto.verify(
      null,                              // ed25519：算法置 null
      bodyBytes,                         // 消息 = 配置原始字节
      crypto.createPublicKey(pub),       // 内置可信公钥
      sig,
    )
  } catch {
    return false
  }
}
module.exports = { verifyRemoteConfig }
```

`doDownloadRemoteConfig` 内新增的校验片段（示意，保留原 `request` 调用）：
```js
const { verifyRemoteConfig } = require('./config/remote-config-signing')

// 与配置并行下载签名
const sigRaw = await fetchSidecar(remoteConfigUrl + '.sig')   // 复用 request
let sigObj
try { sigObj = JSON.parse(sigRaw) } catch { sigObj = null }
if (!sigObj || !verifyRemoteConfig(Buffer.from(body), sigObj.sig, sigObj.kid)) {
  log.error('远程配置签名校验失败，拒绝应用:', remoteConfigUrl)
  reject(new Error('remote config signature verification failed'))
  return
}
// 通过后再走原有的 解析 → 比对 → 写盘 → changed
```

## 7. 小结
当前远程配置拉取**不会主动降级到 http**（P0 的 https 强制已落地：http 地址自动改写为 https 并写回用户配置），且**普通网络 MITM 被 TLS 校验拦住**；剩余最大缺口是**全程无任何内容完整性校验**，安全完全依赖「合法证书 + DNS + 公共 CA」。下一步用 P1 的 ed25519 签名校验把「拿到合法证书即可投毒」这条路径堵死。

## 8. 附：已有的相关风险面（fake SNI + verifyHost）
远程配置不仅能控制 DNS/重定向，还能通过拦截规则指定 `sni`（握手伪装的 SNI）与 `verifyHost`（证书校验域名）：
- 默认：证书按**真实域名**校验，`sni` 仅用于握手伪装。
- 当规则显式配置 `verifyHost` 且 ≠ 真实域名时，`checkServerIdentity` 改为按 `verifyHost` 校验（`mitmproxy/.../createRequestHandler.js`）。
- **风险**：此时证书校验**不再绑定真实目标域名**，任何能拿到 `verifyHost` 合法证书的中间人都能冒充真实域名，削弱防 MITM 保护。该能力对「换 SNI 敲门」类站点（如 huggingface.co 用 huggingface.cn 的 SNI 连、服务器返回 huggingface.cn 证书）是必须的，但绝不可用于无关第三方域名。
- **已加警告**（2026-10-04）：
  - `createRequestHandler.js` 在 `verifyHost !== realHost` 时打 `log.warn('[安全风险] ...')`，每命中该规则的请求都会提示。
  - `sni.js` 的 `applyVerifyHost` JSDoc 增加「配置作者必读」安全提示，说明 MITM 风险与适用边界。

---
*审计时间：2026-10-04。涉及代码均为 `vendor/ds-core` 子模块（已推送到 `Blue-Frontier/ds-core` `main`）。*
