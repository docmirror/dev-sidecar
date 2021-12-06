# linux 支持
`linux`使用说明，目前仅支持`ubuntu_x64（GNOME）`，其他`linux`未测试

> 注意：需要开启[sudo免密支持](https://www.jianshu.com/p/5d02428f313d) 

## 安装

### 1. ubuntu
 * 下载`DevSidecar-x.x.x.deb`
 * 执行命令安装 `dpkg -i DevSidecar-x.x.x.deb`
 * 去应用列表里面找到dev-sidecar应用，打开即可

### 2. 其他linux系统（未测试）
* 下载 `DevSidecar-x.x.x.AppImage`
* 设置可执行权限 `sudo chmod +X DevSidecar-x.x.x.AppImage`
* 双击运行

## 证书安装
默认模式和增强模式需要系统信任CA证书。   
由于linux上火狐和chrome都不走系统证书，所以除了安装系统证书之外，还需要给浏览器安装证书
### 1. 系统证书安装
根据弹出的提示：
 * 点击首页右上角“安装根证书”按钮
 * 点击“点此去安装”
 * 提示安装成功即可

### 2. 火狐浏览器安装证书
* 火狐浏览器->选项->隐私与安全->证书->查看证书   
* 证书颁发机构->导入    
* 选择证书文件在`~/.dev-sidecar`目录下    
* 勾选信任由此证书颁发机构来标识网站，确定即可

### 3. chrome浏览器安装证书
证书文件目录为`~/.dev-sidecar`
![](../packages/gui/public/setup-linux.png)


