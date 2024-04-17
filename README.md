# dev-sidecar 脚本分支

当前分支用于提供最新版本的一些实用脚本，供大家使用。

注：请使用 [DevSidecar-1.8.1](https://github.com/docmirror/dev-sidecar/releases) 及以上版本。 

## 各脚本使用（配置）方法：

### `/github/monkey.js`: Github油猴脚本-拦截配置

```json
{
  "github.com": {
    "^(/[\\w-.]+){2,}/?(\\?.*)?$": {
      "script": [
        "https://raw.githubusercontent.com/docmirror/dev-sidecar/scripts/github/monkey.js"
      ],
      "desc": "加载DS仓库中的Github油猴脚本，加速clone和文件下载等。"
    }
  }
}
```
