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
          应用启动时会向下面的地址请求配置补丁，无需发布升级包即可获得最新优化后的github访问体验。
          <br/>如果您觉得远程更新配置有安全风险，请关闭此功能。
        </div>
      </a-form-item>
      <a-form-item label="远程配置地址" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-input v-model="config.app.remoteConfig.url"></a-input>
      </a-form-item>
      <a-form-item label="重载远程配置" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-button :disabled="config.app.remoteConfig.enabled === false" :loading="reloadLoading" icon="sync" @click="reloadRemoteConfig()">重载远程配置</a-button>
        <div class="form-help">
          注意，部分远程配置文件所在站点，修改内容后可能需要等待一段时间才能生效。
          <br/>如果重载远程配置后发现下载的还是修改前的内容，请稍等片刻再重试。
        </div>
      </a-form-item>
      <a-form-item label="首页提示" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-radio-group v-model="config.app.showShutdownTip"
                       default-value="true" button-style="solid">
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
        <a-radio-group v-model="config.app.closeStrategy"
                       default-value="0" button-style="solid">
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
    </div>
    <template slot="footer">
      <div class="footer-bar">
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
      reloadLoading: false
    }
  },
  created () {

  },
  mounted () {
  },
  methods: {
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
    onAutoStartChange () {
      this.$api.autoStart.enabled(this.config.app.autoStart.enabled)
      this.saveConfig()
    },
    async reloadAndRestart () {
      this.$api.config.reload()
      if (this.status.server.enabled || this.status.proxy.enabled) {
        await this.$api.proxy.restart()
        await this.$api.server.restart()
        this.$message.info('代理服务和系统代理重启成功')
      } else {
        this.$message.info('代理服务和系统代理未启动，无需重启')
      }
    },
    async onRemoteConfigEnabledChange () {
      await this.saveConfig()
      if (this.config.app.remoteConfig.enabled === true) {
        this.reloadLoading = true
        this.$message.info('开始下载远程配置')
        await this.$api.config.downloadRemoteConfig()
        this.$message.info('下载远程配置成功，开始重启代理服务和系统代理')
        await this.reloadAndRestart()
        this.reloadLoading = false
      } else {
        this.$message.info('开始重启代理服务和系统代理')
        await this.reloadAndRestart()
      }
    },
    async reloadRemoteConfig () {
      this.reloadLoading = true

      const remoteConfig = {}

      await this.$api.config.readRemoteConfigStr().then((ret) => { remoteConfig.old = ret })
      await this.$api.config.downloadRemoteConfig()
      await this.$api.config.readRemoteConfigStr().then((ret) => { remoteConfig.new = ret })

      if (remoteConfig.old === remoteConfig.new) {
        this.$message.info('远程配置没有变化，不做任何处理。')
        this.$message.warn('如果您确实修改了远程配置，请稍等片刻再重试！')
      } else {
        this.$message.success('获取到了最新的远程配置，开始重启代理服务和系统代理')
        await this.reloadAndRestart()
      }

      this.reloadLoading = false
    }
  }
}
</script>
<style lang="sass">
</style>
