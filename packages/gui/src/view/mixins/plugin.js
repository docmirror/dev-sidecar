import lodash from 'lodash'
import DsContainer from '../components/container'

export default {
  components: {
    DsContainer,
  },
  data () {
    return {
      key: undefined,
      config: undefined,
      status: {},
      labelCol: { span: 5 },
      wrapperCol: { span: 19 },
      resetDefaultLoading: false,
      applyLoading: false,
      systemPlatform: '',
    }
  },
  created () {
    this.init()
  },
  mounted () {
  },
  methods: {
    getKey () {
      if (this.key) {
        return this.key
      }
      throw new Error('请设置key')
    },
    async init () {
      this.status = this.$status
      await this.reloadConfig()
      this.printConfig('Init, ')
      this.systemPlatform = await this.$api.info.getSystemPlatform()

      if (this.ready) {
        return this.ready(this.config)
      }
    },
    async apply () {
      if (this.applyLoading === true) {
        return // 防重复提交
      }
      this.applyLoading = true
      try {
        await this.applyBefore()
        await this.saveConfig()
        await this.applyAfter()
      } finally {
        this.applyLoading = false
      }
    },
    async applyBefore () {

    },
    async applyAfter () {

    },
    resetDefault () {
      const key = this.getKey()
      this.$confirm({
        title: '提示',
        content: '确定要恢复默认设置吗？',
        cancelText: '取消',
        okText: '确定',
        onOk: async () => {
          this.resetDefaultLoading = true
          try {
            this.config = await this.$api.config.resetDefault(key)
            if (this.ready) {
              await this.ready(this.config)
            }
            await this.apply()
          } finally {
            this.resetDefaultLoading = false
          }
        },
        onCancel () {},
      })
    },
    saveConfig () {
      return this.$api.config.save(this.config).then((ret) => {
        this.$message.success('设置已保存')
        this.setConfig(ret.allConfig)
        this.printConfig('After saveConfig(), ')
        return ret
      })
    },
    getConfig (key) {
      const value = lodash.get(this.config, key)
      if (value == null) {
        return {}
      }
      return value
    },
    setConfig (newConfig) {
      this.$set(this, 'config', newConfig)
    },
    printConfig (prefix = '') {
      console.log(`${prefix}${this.key} page config:`, this.config, this.systemPlatform)
    },
    getStatus (key) {
      const value = lodash.get(this.status, key)
      if (value == null) {
        return {}
      }
      return value
    },
    async reloadConfig () {
      const config = await this.$api.config.reload()
      this.setConfig(config)
    },
    async reloadConfigAndRestart () {
      if (this.$api.plugin.git.isEnabled()) {
        await this.$api.plugin.git.close()
      }
      await this.reloadConfig()
      this.printConfig('After reloadConfigAndRestart(), ')
      if (this.status.server.enabled || this.status.proxy.enabled) {
        await this.$api.proxy.restart()
        await this.$api.server.restart()
        if (this.$api.plugin.git.isEnabled()) {
          await this.$api.plugin.git.start()
        }
        this.$message.success('代理服务和系统代理重启成功')
      } else {
        this.$message.info('代理服务和系统代理未启动，无需重启')
      }
    },
    isWindows () {
      return this.systemPlatform === 'windows'
    },
    isMac () {
      return this.systemPlatform === 'mac'
    },
    isLinux () {
      return this.systemPlatform === 'linux'
    },
    async openLog () {
      const dir = await this.$api.info.getLogDir()
      this.$api.ipc.openPath(dir)
    },
    async focusFirst (ref) {
      if (ref && ref.length != null) {
        setTimeout(() => {
          if (ref.length > 0) {
            try {
              ref[0].$el.querySelector('.ant-input').focus()
            } catch (e) {
              console.error('获取输入框焦点失败：', e)
            }
          }
        }, 100)
      }
    },
    handleHostname (hostname) {
      if (this.isNotHostname(hostname)) {
        return ''
      }

      // 移除所有空白符
      return hostname.replaceAll(/\s+/g, '')
    },
    isNotHostname (hostname) {
      // 暂时只判断数字
      return !hostname || /^[\d\s]+$/.test(hostname)
    },
  },
}
