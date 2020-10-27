# dev-sidecar
开发者边车，命名取自service-mesh的service-sidecar，意为为开发者打辅助的边车工具    
通过本地代理的方式将请求代理到一些国内的加速通道上
解决一些网站和库无法访问或访问速度慢的问题

## 特性

### 1、 github的release、source、zip下载加速
可解决npm install 时某些安装包下载不下来的问题

### 2、 解决git push某些情况下需要临时输入账号密码的问题
通过将api.github.com域名解析到美国服务器

### 3、 github的源代码查看（raw/blame查看）
通过跳转到国内加速链接上
### 4、 Stack Overflow 加速
将ajax.google.com代理到加速代理上 ,recaptcha 加速
### 5、 google cdn 加速
通过代理到加速链接上

### 6、 更多加速配置
等你来提issue

## 快速开始

### 1、安装与启动
```shell
git clone https://gitee.com/docmirror/dev-sidecar.git
cd ./dev-sidecar/packages/core
npm install
npm run start

#或使用cnpm
cnpm install
npm run start

#或使用yarn
yarn install
npm run start

```

输出
```
CA Cert saved in: C:\Users\Administrator\.dev-sidecar\dev-sidecar.ca.crt
CA private key saved in: C:\Users\Administrator\.dev-sidecar\dev-sidecar.ca.key.pem

dev-sidecar启动端口: 1181
代理已开启, 127.0.0.1 1181

```
启动后会自动设置系统代理、npm代理   

### 2、设置信任根证书

第一次启动时会本地随机生成一个根证书放在此目录下（由于此证书是本地随机生成的，所以信任它是安全的）   
```
# 你的Home路径如果有修改，输出会不一样，请按照实际日志输出路径查看
CA Cert saved in: C:\Users\Administrator\.dev-sidecar\dev-sidecar.ca.crt
```

windows用户安装根证书
```
start %HOMEPATH%/.dev-sidecar/dev-sidecar.ca.crt
或者 
打开`C:\Users\Administrator\.dev-sidecar\`文件夹，双击`dev-sidecar.ca.crt`
```
依次点击安装证书->所有用户->将所有证书都放入下列存储->受信任的根证书颁发机构->确定，下一步，确定即可

![](./doc/setup.png)

Mac 用户安装根证书
```
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/.dev-sidecar/dev-sidecar.ca.crt
```

### 开始加速吧
去github上`Download ZIP`、`Release` 下载试试，体验秒下的感觉

比如去下载它： https://github.com/greper/d2-crud-plus/archive/master.zip



## 最佳实践

把dev-sidecar一直开着就行了

### npm加速
 1. yarn 设置淘宝镜像registry
 2. npm设置官方registry。 
 3. 项目install使用yarn，发布包publish用npm，互不影响
 
### 其他加速
 1. git clone 加速  [fgit-go](https://github.com/FastGitORG/fgit-go)
 2. github.com代理网站(不能登录) [hub.fastgit.org](https://hub.fastgit.org/)


## api

### 拦截配置
没有配置域名的不会拦截，其他根据配置进行拦截处理
```js
'github.com': [
  { // 此条配置  release archive 下载链接替换,
    regexp: [ //需要拦截的url
      '/.*/.*/releases/download/',
      '/.*/.*/archive/'
    ],
    //拦截类型
    // redirect:url,  临时重定向(url会变，一些下载资源可以通过此方式配置)
    // proxy:url,     代理（url不会变，没有跨域问题）
    // abort:true,    取消请求（适用于被GFW封锁的资源，找不到替代，直接取消请求，快速失败，节省时间）
    redirect: 'https://download.fastgit.org' //跳转到加速下载链接上
  },
  'ajax.googleapis.com': [
    {
      regexp:'.*'                       // .* 拦截全部url路径，可省略
      proxy: 'https://ajax.loli.net'    //代理到加速链接上（url不会变，没有跨域问题，适用于一些静态资源比如js、css的请求）
    }
  ],
  'clients*.google.com': [ 
    {
      abort: true //取消请求，被GFW封锁的资源，找不到替代，直接取消请求，快速失败，节省时间
    }
  ]
],
```

### DNS配置
某些域名（比如api.github.com）会被解析到新加坡的ip上，新加坡的服务器在上午挺好，到了晚上就卡死，基本不可用。     
所以将这些域名解析到美国服务器上就可以正常访问

```js
 dns: {
    mapping: {
      // "解决push的时候需要输入密码的问题",
      'api.github.com': 'usa', //配置该域名，使用USA的域名解析服务器
      'gist.github.com': 'usa'
      // "avatars*.githubusercontent.com": "usa"
    }
  },
```

注意：暂时只支持IPv4的解析


## 开发计划
1. 桌面端，右下角小图标
2. √ google cdn加速 

## 感谢
本项目参考如下开源项目
* [node-mitmproxy](https://github.com/wuchangming/node-mitmproxy)   
* [ReplaceGoogleCDN](https://github.com/justjavac/ReplaceGoogleCDN)

本项目加速资源由如下组织提供
* [fastgit](https://fastgit.org/)
