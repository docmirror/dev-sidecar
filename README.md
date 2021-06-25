# dev-sidecar
开发者边车，命名取自service-mesh的service-sidecar，意为为开发者打辅助的边车工具    
通过本地代理的方式将https请求代理到一些国内的加速通道上
    
<a href='https://gitee.com/docmirror/dev-sidecar'><img src='https://gitee.com/docmirror/dev-sidecar/badge/star.svg?theme=dark' alt='star'/></a>
<a href='https://github.com/docmirror/dev-sidecar'><img alt="GitHub stars" src="https://img.shields.io/github/stars/docmirror/dev-sidecar?logo=github"></a>
    
      

## 特性

### 1、 dns优选（解决***污染问题）
* 根据网络状况智能解析最佳域名ip地址，获取最佳网络速度     
* 解决一些网站和库无法访问或访问速度慢的问题
* 建议遇到打开比较慢的国外网站，可以优先尝试将该域名添加到dns设置中（注意：被***封杀的无效）      

### 2、 请求拦截
* 拦截打不开的网站，代理到加速镜像站点上去。    
* 可配置多个镜像站作为备份    
* 具备测速机制，当访问失败或超时之后，自动切换到备用站点，使得目标服务高可用

### 3、 github加速
* release、source、zip下载加速
* clone 加速
* 头像加速
* 解决readme中图片引用无法加载的问题
* gist.github.com 加速
* 解决git push 偶尔失败需要输入账号密码的问题（fatal: TaskCanceledException encountered  /  fatal: HttpRequestException encountered）
* raw/blame加速

### 4、 Stack Overflow 加速
* 将ajax.google.com代理到加速CDN上     
* recaptcha 图片验证码加速

### 5、 npm加速
* 支持开启npm代理
* 官方与淘宝npm registry一键切换,
* 某些npm install的时候，并且使用cnpm也无法安装时，可以尝试开启npm代理再试

### 6、 增强功能
* 众所周知的原因，不能说太多，默认关闭，感兴趣的可以私下交流
* 反正开了这个之后，上面那些dns优选什么的特性好像都不香了

***安全警告***：
* 请勿使用来源不明的服务地址，有隐私和账号泄露风险
* 本应用及服务端承诺不收集任何信息。介意者请使用安全模式。
* 建议自建服务端（增强功能页面右上角点击查看自建服务端方法）

## 快速开始
支持windows、Mac

### DevSidecar桌面应用
 
#### 1 下载安装包 
* release下载     
[Gitee Release](https://gitee.com/docmirror/dev-sidecar/releases)  
[Github Release](https://github.com/docmirror/dev-sidecar/releases)  

  Windows: 请选择DevSidecar-x.x.x.exe   
  Mac: 请选择DevSidecar-x.x.x.dmg


#### 2 安装后打开    
注意：mac版安装需要在“系统偏好设置->安全性与隐私->通用”中解锁并允许应用安装

![](./doc/index.png)     

#### 3 安装根证书     
       
第一次打开会提示安装证书，根据提示操作即可      
 
> 根证书是本地随机生成的，所以不用担心根证书的安全问题（本应用不收集任何用户信息）     
> 你也可以在加速服务设置中自定义根证书（PEM格式的证书与私钥） 

#### 4 开始加速吧      
去试试打开github   
 
---------
> 第一次访问会去国外的dns服务器上获取ip，会比较慢一点，后面就快了 
---------

### 开启前 vs 开启后 
 
|  | 开启前 | 开启后 |
| ---- | ---- | ---- |
|头像| ![](./doc/avatar2.png) |![](./doc/avatar1.png)  |
|clone |![](./doc/clone-before.png) |![](./doc/clone.png)    |  
|zip 下载 |![](./doc/download-before.png) |![](./doc/download.png)秒下的，实在截不到速度的图    |  


## 模式说明

### 安全模式
* 此模式：关闭拦截、关闭增强、开启dns优选、开启测速
* 最安全，无需安装证书，可以在浏览器地址栏左侧查看域名证书
* 功能也最弱，只有特性1，相当于查询github的国外ip，手动改hosts一个意思。
* github的可访问性不稳定，取决于IP测速，如果有绿色ip存在，就 `有可能` 可以直连访问。
  ![](./doc/speed.png)

### 默认模式
* 此模式：开启拦截、关闭增强、开启dns优选、开启测速
* 需要安装证书
* 功能上包含特性1/2/3/4。

### 增强模式
* 此模式：开启拦截、开启增强、开启dns优选、关闭测速
* 需要安装证书
* 功能上包含特性1/2/3/4/5
* 由于敏感原因，默认关闭，感兴趣的可以私下交流

## 最佳实践

* 把dev-sidecar一直开着就行了
* 建议遇到打开比较慢的国外网站，可以尝试将该域名添加到dns设置中（注意：被GFW封杀的无效）    
* 有时候安全模式打开github也挺快

### 其他加速
 1. git clone 加速      
 
 方式1：快捷复制：     
  > 开启脚本支持，然后在复制clone链接下方，即可复制到加速链接    
    
 方式2：
  > 使用方式用实际的名称替换{}的内容，即可加速clone  
  > https://hub.fastgit.org/{username}/{reponame}.git     
  > clone 出来的 remote "origin" 为fastgit的地址，需要手动改回来  
  > 你也可以直接使用他们的clone加速工具 [fgit-go](https://github.com/FastGitORG/fgit-go)

 2. github.com的镜像网站(注意：不能登录)   
   >1. [hub.fastgit.org](https://hub.fastgit.org/) 
   >2. [github.com.cnpmjs.org](https://github.com.cnpmjs.org/) 这个很容易超限


## api

### 拦截配置
没有配置域名的不会拦截，其他根据配置进行拦截处理
```js
const intercepts = {
  // 要拦截的域名
  'github.com': {
     //需要拦截url的正则表达式
     '/.*/.*/releases/download/': {
        //拦截类型
        // redirect:url,  临时重定向(url会变，一些下载资源可以通过此方式配置)
        // proxy:url,     代理（url不会变，没有跨域问题）
        // abort:true,    取消请求（适用于被GFW封锁的资源，找不到替代，直接取消请求，快速失败，节省时间）
        // success:true,  直接返回成功请求（某些请求不想发出去，可以伪装成功返回）
        redirect: 'download.fastgit.org'
      },
   },
   'ajax.googleapis.com': {
     '.*': {
       proxy: 'ajax.loli.net', //代理请求，url不会变
       backup: ['ajax.proxy.ustclug.org'], //备份，当前代理请求失败后，将会切换到备用地址
       test: 'ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js',
       replace:'/(.*)/xxx'//当加速地址的链接和原链接不是完全相同时，可以通过正则表达式replace，此时proxy通过$1$2来重组url， proxy:'ajax.loli.net/xxx/$1'
     }
   },
   'clients*.google.com': {
      '.*':{
        abort: true //取消请求，被GFW封锁的资源，找不到替代，直接取消请求，快速失败，节省时间
      }
    }       
}
```

### DNS优选配置
某些域名解析出来的ip会无法访问，（比如api.github.com会被解析到新加坡的ip上，新加坡的服务器在上午挺好，到了晚上就卡死，基本不可用）        
通过从dns上获取ip列表，切换不同的ip进行尝试，最终会挑选到一个最快的ip

```js
 dns: {
    mapping: {
      //
      'api.github.com': 'usa', // "解决push的时候需要输入密码的问题",
      'gist.github.com': 'usa' // 解决gist无法访问的问题
      "*.githubusercontent.com": "usa" // 解决github头像经常下载不到的问题
    }
  },
```
注意：暂时只支持IPv4的解析

## 问题排查

### 1、dev-sidecar的前两个开关没有处于打开状态
1. 尝试将开关按钮手动打开
2. 请尝试右键dev-sidecar图标，点退出。再重新打开
3. 如果还不行，请将日志发送给作者
   
如果是mac系统，可能是下面的原因

#### Mac系统使用时，首页的系统代理开关无法打开
出现这个问题可能是没有开启系统代理命令的执行权限   
```
networksetup -setwebproxy 'WiFi' 127.0.0.1 1181 
#看是否有如下错误提示
** Error: Command requires admin privileges.
```
如果有上面的错误提示，请尝试如下两种方法：

1、 取消访问偏好设置需要管理员密码
系统偏好设置—>安全性与隐私—> 通用—> 高级—> 访问系统范围的偏好设置需要输入管理员密码（取消勾选）

2、 可能是由于安装了xcode，但未授权导致
请在终端输入如下命令进行授权
```
sudo xcodebuild -license
# 一直按回车，该agree的时候输入agree即可
```
然后再次尝试看是否能够打开系统代理开关       
如果还不行，请联系作者

### 2、没有加速效果
***本应用仅支持https加速，请务必确认你访问的网站地址是https开头的***    

1. 本应用仅支持https加速
请务必确认你访问的地址是https开头的
比如： https://github.com/

2. 检查浏览器是否装了什么插件，与ds有冲突
   
3. 检查是否安装了其他代理软件，与ds有冲突
   
4. 请确认浏览器的代理设置为使用IE代理/或者使用系统代理状态

6. 可以尝试换个浏览器试试

7. 请确认网络代理设置处于勾选状态    
正常情况下dev-sidecar在“系统代理”开关打开时，会自动设置代理。

 如何打开查看windows代理设置：    
 * win10: 开始->设置->网络和Internet->最下方代理      
 * win7: 开始->控制面板->网络和Internet->网络和共享中心->左下角Internet选项->连接选项卡->局域网设置      

windows 代理查看      
![windows](./doc/proxy.png)

mac 代理查看     
![](./doc/mac-proxy.png)






### 3、浏览器打开提示证书不受信任

* windows: 请确认证书已正确安装在“信任的根证书颁发机构”下    

* mac: 请确认证书已经被安装并已经设置信任。   

* 火狐浏览器：火狐浏览器不走系统的根证书，需要在选项中添加根证书   
1、火狐浏览器->选项->隐私与安全->证书->查看证书   
2、证书颁发机构->导入    
3、选择证书文件`C:\Users\Administrator\.dev-sidecar\dev-sidecar.ca.crt`（Mac为`~/.dev-sidecar`目录）    
4、勾选信任由此证书颁发机构来标识网站，确定即可      

### 4. 打开github显示连接超时
  ```html
DevSidecar Warning:
Error: www.github.com:443, 代理请求超时
```
如果是安全模式，则是因为不稳定导致的，等一会再刷新试试     
如果是默认模式/增强模式，则是由于访问人数过多，正常现象

### 5、查看日志是否有报错
 如果还是不行，请在下方加作者好友，将服务日志发送给作者进行分析             
 日志打开方式：加速服务->右边日志按钮->打开日志文件夹    

![](./doc/log.png)   


### 6、某些原本可以打开的网站打不开了
1、可以尝试关闭pac    
2、可以将域名加入白名单，设置方式参考：https://github.com/docmirror/dev-sidecar/issues/25

### 7、 git push报错
当git push的数据大于200k时，会报错，目前的方案不太好解决。     
临时方案：切到安全模式，尝试git push，多试几次就可以了。


## 贡献代码

### 开发调试模式启动

运行如下命令即可开发模式启动
```shell
git clone https://github.com/docmirror/dev-sidecar

cd dev-sidecar 

npm install lerna -g
lerna bootstrap

cd packages/gui

npm run electron

```

### 打包成可执行文件
```shell
cd packages/gui
npm run electron:build
```

### 提交pr
如果你想将你的修改贡献出来，请提交pr


## 联系作者

欢迎bug反馈，需求建议，技术交流等（请备注dev-sidecar，或简称DS）      

![](./doc/contact.png)      


## 求star
我的其他项目求star
* [fast-crud](https://github.com/fast-crud/fast-crud) : 开发crud快如闪电
* [certd](https://github.com/certd/certd) : 让你的证书永不过期

## 广告
* [腾讯云企业老用户3折服务器](https://curl.qcloud.com/MRY91neQ)
* [腾讯云新用户大礼包](https://curl.qcloud.com/VQ2ARft2)
* [阿里云618](https://www.aliyun.com/activity/618/2021?userCode=qya11txb)

## 感谢
本项目使用lerna包管理工具   

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)

本项目参考如下开源项目
* [node-mitmproxy](https://github.com/wuchangming/node-mitmproxy)   
* [ReplaceGoogleCDN](https://github.com/justjavac/ReplaceGoogleCDN)
* [github增强油猴脚本](https://greasyfork.org/zh-CN/scripts/412245-github-%E5%A2%9E%E5%BC%BA-%E9%AB%98%E9%80%9F%E4%B8%8B%E8%BD%BD)

本项目加速资源由如下组织提供
* [FastGit UK](https://fastgit.org/)


