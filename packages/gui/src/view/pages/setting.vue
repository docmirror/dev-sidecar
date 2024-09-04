<template>
  <ds-container>
    <template slot="header">
      设置
      <span>
      </span>
    </template>

    <div v-if="config">
      <a-form-item label="开机自启" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.app.autoStart.enabled" @change="onAutoStartChange">
          本应用开机自启
        </a-checkbox>
        <a-button class="md-mr-10" icon="profile" @click="openLog()">日志</a-button>
        <div class="form-help">
          windows下建议开启开机自启。<a @click="openExternal('https://github.com/docmirror/dev-sidecar/blob/master/doc/recover.md')">更多说明参考</a>
        </div>
      </a-form-item>
      <a-form-item v-if="systemPlatform === 'mac'" label="隐藏Dock图标" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.app.dock.hideWhenWinClose">
          关闭窗口时隐藏Dock图标(仅限Mac)
        </a-checkbox>
        <div class="form-help">
          修改后需要重启应用
        </div>
      </a-form-item>
      <a-form-item label="远程配置" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.app.remoteConfig.enabled" @change="onRemoteConfigEnabledChange">
          启用远程配置
        </a-checkbox>
        <div class="form-help">
          应用启动时会向下面的地址请求配置补丁，获得最新的优化后的github访问体验。<br/>
          如果您觉得远程配置有安全风险，请关闭此功能，或删除共享远程配置，仅使用个人远程配置。<br/>
          配置优先级：本地修改配置  >  个人远程配置  >  共享远程配置
        </div>
      </a-form-item>
      <a-form-item label="共享远程配置地址" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-input v-model="config.app.remoteConfig.url"></a-input>
      </a-form-item>
      <a-form-item label="个人远程配置地址" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-input v-model="config.app.remoteConfig.personalUrl"></a-input>
      </a-form-item>
      <a-form-item label="重载远程配置" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-button :disabled="config.app.remoteConfig.enabled === false" :loading="reloadLoading" icon="sync" @click="reloadRemoteConfig()">重载远程配置</a-button>
        <div class="form-help">
          注意，部分远程配置文件所在站点，修改内容后可能需要等待一段时间才能生效。<br/>
          如果重载远程配置后发现下载的还是修改前的内容，请稍等片刻再重试。
        </div>
      </a-form-item>
      <a-form-item label="主题设置" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-radio-group v-model="config.app.theme" default-value="light" button-style="solid">
          <a-radio-button :value="'light'" title="light">
            亮色
          </a-radio-button>
          <a-radio-button :value="'dark'" title="dark">
            暗色
          </a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="首页提示" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-radio-group v-model="config.app.showShutdownTip" default-value="true" button-style="solid">
          <a-radio-button :value="true">
            显示
          </a-radio-button>
          <a-radio-button :value="false">
            隐藏
          </a-radio-button>
        </a-radio-group>
        <div class="form-help">
          是否显示首页的警告提示
        </div>
      </a-form-item>
      <a-form-item v-if="!isLinux()" label="关闭策略" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-radio-group v-model="config.app.closeStrategy" default-value="0" button-style="solid">
          <a-radio-button :value="0">
            弹出提示
          </a-radio-button>
          <a-radio-button :value="1">
            直接退出
          </a-radio-button>
          <a-radio-button :value="2">
            最小化到系统托盘
          </a-radio-button>
        </a-radio-group>
        <div class="form-help">
          点击窗口右上角关闭按钮的效果
        </div>
      </a-form-item>
      <a-form-item label="自动检查更新" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-radio-group v-model="config.app.autoChecked" default-value="light" button-style="solid">
          <a-radio-button :value="true">
            开启
          </a-radio-button>
          <a-radio-button :value="false">
            关闭
          </a-radio-button>
        </a-radio-group>
        <div class="form-help">
          开启自动检查更新后，每次应用启动时会检查一次更新，如有新版本，则会弹出提示。
        </div>
      </a-form-item>
      <a-form-item label="忽略预发布版本" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-radio-group v-model="config.app.skipPreRelease" default-value="light" button-style="solid">
          <a-radio-button :value="true">
            忽略
          </a-radio-button>
          <a-radio-button :value="false">
            不忽略
          </a-radio-button>
        </a-radio-group>
        <div class="form-help">
          预发布版本号为带有 “-” 的版本。注：该配置只对当前版本为正式版本时有效。
        </div>
      </a-form-item>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button :loading="removeUserConfigLoading" class="md-mr-10" icon="sync" @click="restoreFactorySettings()">恢复出厂设置</a-button>
        <a-button :loading="resetDefaultLoading" class="md-mr-10" icon="sync" @click="resetDefault()">恢复默认</a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">应用</a-button>
      </div>
    </template>
  </ds-container>

</template>

<script>
import Plugin from '../mixins/plugin'
export default {
  name: 'Setting',
  mixins: [Plugin],
  data () {
    return {
      key: 'app',
      removeUserConfigLoading: false,
      reloadLoading: false,
      themeBackup: null,
      urlBackup: null,
      personalUrlBackup: null
    }
  },
  created () {

  },
  mounted () {
  },
  methods: {
    ready (config) {
      this.themeBackup = config.app.theme
      this.urlBackup = config.app.remoteConfig.url
      this.personalUrlBackup = config.app.remoteConfig.personalUrl
    },
    async openLog () {
      const dir = await this.$api.info.getConfigDir()
      this.$api.ipc.openPath(dir + '/logs/')
    },
    async applyAfter () {
      let reloadLazy = 10

      // 判断远程配置地址是否变更过，如果是则重载远程配置并重启服务
      if (this.config.app.remoteConfig.url !== this.urlBackup || this.config.app.remoteConfig.personalUrl !== this.personalUrlBackup) {
        await this.$api.config.downloadRemoteConfig()
        await this.reloadConfigAndRestart()
        reloadLazy = 300
      }

      // 判断是否切换了主题，如果是，则刷新页面
      if (this.config.app.theme !== this.themeBackup) {
        setTimeout(() => window.location.reload(), reloadLazy)
      }
    },
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
    onAutoStartChange () {
      this.$api.autoStart.enabled(this.config.app.autoStart.enabled)
      this.saveConfig()
    },
    async onRemoteConfigEnabledChange () {
      await this.saveConfig()
      if (this.config.app.remoteConfig.enabled === true) {
        this.reloadLoading = true
        this.$message.info('开始下载远程配置')
        await this.$api.config.downloadRemoteConfig()
        this.$message.info('下载远程配置成功，开始重启代理服务和系统代理')
        await this.reloadConfigAndRestart()
        this.reloadLoading = false
      } else {
        this.$message.info('远程配置已关闭，开始重启代理服务和系统代理')
        await this.reloadConfigAndRestart()
      }
    },
    async reloadRemoteConfig () {
      if (this.config.app.remoteConfig.enabled === false) {
        return
      }
      this.reloadLoading = true

      const remoteConfig = {}

      await this.$api.config.readRemoteConfigStr().then((ret) => { remoteConfig.old1 = ret })
      await this.$api.config.readRemoteConfigStr('_personal').then((ret) => { remoteConfig.old2 = ret })
      await this.$api.config.downloadRemoteConfig()
      await this.$api.config.readRemoteConfigStr().then((ret) => { remoteConfig.new1 = ret })
      await this.$api.config.readRemoteConfigStr('_personal').then((ret) => { remoteConfig.new2 = ret })

      if (remoteConfig.old1 === remoteConfig.new1 && remoteConfig.old2 === remoteConfig.new2) {
        this.$message.info('远程配置没有变化，不做任何处理。')
        this.$message.warn('如果您确实修改了远程配置，请稍等片刻再重试！')
      } else {
        this.$message.success('获取到了最新的远程配置，开始重启代理服务和系统代理')
        await this.reloadConfigAndRestart()
      }

      this.reloadLoading = false
    },
    async restoreFactorySettings () {
      this.$confirm({
        title: '提示',
        content: '确定要恢复出厂设置吗？？？？？？？？？？？？——————————————————————警告：该功能将删除您的所有页面的个性化配置，并重载默认配置及远程配置（如果启用了的话），请谨慎操作！！！',
        cancelText: '取消',
        okText: '确定',
        onOk: async () => {
          this.removeUserConfigLoading = true
          const result = await this.$api.config.removeUserConfig()
          if (result) {
            this.config = await this.$api.config.get()
            this.$message.success('恢复出厂配置成功，开始重启代理服务和系统代理')
            await this.reloadConfigAndRestart()
          } else {
            this.$message.info('已是出厂配置，无需恢复')
          }
          this.removeUserConfigLoading = false
        },
        onCancel () {}
      })
    }
  }
}
</script>
<style lang="sass">
</style>
