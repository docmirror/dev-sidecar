# 网络审查检测器

FreeEye 是一个用 JavaScript 编写的网络审查检测器，自动化检测网络环境并推荐可能的规避方法。

为中国大陆用户设计，但也可用于其他地区。

希望使得用户能够使用本工具回答以下问题：

1. 我的网络是被审查了，还是只是出现了异常故障？
2. 使用了哪些审查手段？
3. 有哪些规避方法可以绕过这些审查？

## 使用方法

前提条件是你需要在设备上安装 `node.js`。

启动向导的方法：

```bash
git clone https://github.com/cute-omega/free-eye.git
cd free-eye
npm install
npm start
```

（如果你不准备进行开发，可以跳过 `npm install`并直接运行 `npm start`；中国大陆用户可能需要设置npm镜像）

不同测试的代码位于 `checkpoints/` 目录中。每个测试都有唯一的 `tag` 标识。单个测试的参数在 `config.json` 文件中设置，使用测试的 tag 作为键：

```json
{
  "tag": {
    // 测试特定的参数
  }
  // ...
}
```

## 测试

### Route（路由）

通过尝试创建一个套接字并连接到一个非本地地址，检测设备是否具有互联网连通性。

### DNS

使用系统的 DNS 解析器尝试解析允许和被封锁的主机名。测试被封锁主机名是否存在 DNS 缓存投毒。

### TCP

尝试与已知允许和已知被封锁的 IP 地址建立 TCP 连接。

### TLS

尝试与已知允许但可能遭受审查的 IP 地址（例如对中国用户来说的“干净”的外国 IP）完成 TLS 握手。测试内容包括：

- 不带任何 SNI 的握手
- 带已知允许的 SNI 的握手
- 带已知被封锁的 SNI 的握手

还测试将 TLS 记录分片作为一种规避方法，通过尝试对被封锁的 SNI 进行握手但分片 ClientHello 来实现。

## 编写你自己的测试

如果你想编写自定义测试，只需实现 `template.js` 中描述的接口，将测试模块保存到 `checkpoints/` 目录，并在 `config.json` 中添加该测试的参数。

# 相关项目

本项目受到来自 [wallpunch/wizard](https://github.com/wallpunch/wizard) 的启发；
用作 [docmirror/dev-sidecar](https://github.com/docmirror/dev-sidecar) 中的网络检测插件。

---

不论在哪里，人们的目光都应该是自由的。
