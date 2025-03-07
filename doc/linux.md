# Linux 支持

`Linux`使用说明，目前仅官方支持`Ubuntu x86_64 GNOME桌面版（原版）`，其他`Linux`未测试

> 注意：需要开启 [sudo 免密支持](https://www.jianshu.com/p/5d02428f313d)，否则请自行安装证书

## 一、安装

### 1.1. Ubuntu / Debian或其衍生版（未测试）

- 下载`DevSidecar-x.x.x.deb`
- 使用 root 执行命令安装 `dpkg -i DevSidecar-x.x.x.deb`
- 去应用列表里面找到 dev-sidecar 应用，打开即可

### 1.2. 其他基于glibc的Linux系统（未测试）

- 下载 `DevSidecar-x.x.x.AppImage`
- 设置可执行权限 `chmod +x DevSidecar-x.x.x.AppImage`
- 双击运行

### 1.3. 特殊的Linux系统（如Alpine和Chimera Linux）

> 此处默认用户有较专业的Linux知识，故不详细描述，请参考并自行试验
- 创建Debian（最方便且省空间）容器，可使用distrobox（推荐），接下来以此为例说明
- 下载deb包并在容器内安装
- 穿透系统设置：
    在容器内 `/usr/bin/gsettings` 文件写入：

    ```bash
    #!/bin/sh
    distrobox-host-exec gsettings "$@"
    ```
    并设置可执行权限

    简化版命令（请在容器内执行）:
    ```
    echo -e '#!/bin/sh\ndistrobox-host-exec gsettings "$@"' >/usr/bin/gsettings
    ```
- 使用命令启动应用，使用“自动安装证书”功能，回到终端，找到输出里含有 `sudo` 的两句命令，复制到主系统执行，如失败（或使用其他证书系统），请自行安装证书，可参考 [议题 #204](https://github.com/docmirror/dev-sidecar/issues/204)

### 1.4. 版本选择

不同CPU架构，选择对应的版本，如果安装失败，请下载 `universal` 版本


## 二、证书安装

默认模式和增强模式需要系统信任CA证书。
由于Linux上火狐和Chrome都不走系统证书，所以除了安装系统证书之外，还需要给浏览器安装证书

### 2.1. 系统证书安装

根据弹出的提示：

- 点击首页右上角“安装根证书”按钮
- 点击“点此去安装”
- 提示安装成功即可

### 2.2. 火狐浏览器安装证书

- 火狐浏览器->选项->隐私与安全->证书->查看证书
- 证书颁发机构->导入
- 选择证书文件在 `~/.dev-sidecar` 目录下
- 勾选信任由此证书颁发机构来标识网站，确定即可

### 2.3. Chrome浏览器安装证书

证书文件目录为 `~/.dev-sidecar`

![](../packages/gui/public/setup-linux.png)
