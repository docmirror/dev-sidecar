# dev-sidecar 脚本分支

当前分支用于提供最新版本的一些实用脚本，供大家使用。

注：请使用 [DevSidecar-1.8.1](https://github.com/docmirror/dev-sidecar/releases) 及以上版本。 

## 各脚本使用（配置）方法：

注：如果以下配置中的链接速度太慢，可以从 [Github油猴脚本](https://github.com/XIU2/UserScript/blob/master/GithubEnhanced-High-Speed-Download.user.js) 的 `raw_url` 中，找一个高速访问raw资源的加速源，来替换以下配置。

### `/tampermonkey.js`: 油猴脚本浏览器扩展自定义配置（未配置时，使用DS内置脚本，不保证最新）

```json
{
  "github.com": {
    "^(/[\\w-.]+){2,}/?(\\?.*)?$": {
      "tampermonkeyScript": "https://mirror.ghproxy.com/https://raw.githubusercontent.com/docmirror/dev-sidecar/scripts/tampermonkey.js"
    }
  }
}
```

### `/GithubEnhanced-High-Speed-Download.user.js`: Github油猴脚本-拦截配置

```json
{
  "github.com": {
    "^(/[\\w-.]+){2,}/?(\\?.*)?$": {
      "script": [
        "https://raw.githubusercontent.com/docmirror/dev-sidecar/scripts/GithubEnhanced-High-Speed-Download.user.js"
      ],
      "desc": "加载DS仓库中的Github油猴脚本，加速clone和文件下载等。"
    }
  }
}
```
