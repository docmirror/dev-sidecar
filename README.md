# dev-sidecar 脚本分支

当前分支用于提供最新版本的一些实用脚本，供大家使用。

请使用 [DevSidecar-1.8.1](https://github.com/docmirror/dev-sidecar/releases/tag/v1.8.1) 的新特性 [#294](https://github.com/docmirror/dev-sidecar/pull/294)，来引用最新版本的脚本。 

## 各脚本使用（配置）方法：

### Github油猴脚本-拦截配置

```json
{
  "github.com": {
    "^(/[^/]+){2}([/?].*)?$": {
      "script": [
        "/ds_github_monkey_script.js"
      ],
      "desc": "加载DS仓库中的Github油猴脚本，加速clone和文件下载等。"
    }
    "^/ds_github_monkey_script.js$": {
      "proxy": "https://raw.githubusercontent.com/docmirror/dev-sidecar/scripts/github/monkey.js",
      "response": { "headers": { "content-type": "application/javascript; charset=utf-8" } }
      "cacheDays": 7,
      "desc": "代理到DS仓库中的Github油猴脚本，并设置响应头 `content-type: 'application/javascript; charset=utf-8'`，同时缓存7天。"
    }
  }
}
```
