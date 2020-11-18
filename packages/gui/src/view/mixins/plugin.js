import DsContainer from '../components/container'
import lodash from 'lodash'

export default {
  components: {
    DsContainer
  },
  data () {
    return {
      config: undefined,
      status: {},
      labelCol: { span: 4 },
      wrapperCol: { span: 20 },
      applyLoading: false
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
    init () {
      this.status = this.$status
      return this.$api.config.reload().then(ret => {
        this.config = ret
        console.log('config', this.config)
        if (this.ready) {
          return this.ready(this.config)
        }
      })
    },
    async apply () {
      this.applyLoading = true
      await this.applyBefore()
      await this.saveConfig()
      await this.applyAfter()
      this.applyLoading = false
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
          this.config = await this.$api.config.resetDefault(key)
          if (this.ready) {
            await this.ready(this.config)
          }
          await this.apply()
        },
        onCancel () {}
      })
    },
    saveConfig () {
      return this.$api.config.save(this.config).then(() => {
        this.$message.info('设置已保存')
      })
    },
    getConfig (key) {
      const value = lodash.get(this.config, key)
      if (value == null) {
        return {}
      }
      return value
    },
    getStatus (key) {
      const value = lodash.get(this.status, key)
      if (value == null) {
        return {}
      }
      return value
    }
  }
}
