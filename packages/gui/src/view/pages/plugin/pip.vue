<template>
  <ds-container>
    <template slot="header">
      PIP加速
      <span style="color:#999;">
      </span>
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
<!--        <a-form-item label="启用PIP加速" :label-col="labelCol" :wrapper-col="wrapperCol">-->
<!--          <a-checkbox v-model="config.plugin.pip.enabled">-->
<!--            随应用启动-->
<!--          </a-checkbox>-->
<!--          <a-tag v-if="status.plugin.pip.enabled" color="green">-->
<!--            当前已启动-->
<!--          </a-tag>-->
<!--          <a-tag v-else color="red">-->
<!--            当前未启动-->
<!--          </a-tag>-->
<!--        </a-form-item>-->
        <a-form-item label="设置环境变量" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.proxy.setEnv" >
            开启系统代理时是否同时修改HTTPS_PROXY环境变量
          </a-checkbox>
          <div class="form-help">开启ds使用pip命令行时需要勾选此选项，否则会报 wrong version number 异常</div>
          <div class="form-help">注意：当前已打开的命令行在开关系统代理后并不会实时生效，需要重新打开一个新的命令行窗口</div>
        </a-form-item>
        <a-form-item label="信任仓库域名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model="config.plugin.pip.setting.trustedHost"></a-input>
          <div>这里配置信任仓库域名，避免出现ssl校验失败错误</div>
        </a-form-item>
        <a-form-item label="仓库镜像" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-radio-group v-model="config.plugin.pip.setting.registry" @change="onSwitchRegistry"
                         default-value="https://pypi.org/simple/" button-style="solid">
            <a-radio-button value="https://pypi.org/simple/">
              原生
            </a-radio-button>
            <a-radio-button value="http://mirrors.aliyun.com/pypi/simple/">
              taobao镜像
            </a-radio-button>
          </a-radio-group>
          <div class="form-help">设置后立即生效，即使关闭ds也会继续保持</div>
        </a-form-item>
      </a-form>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button class="md-mr-10" icon="sync"   @click="resetDefault()">恢复默认</a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">应用</a-button>
      </div>
    </template>
  </ds-container>

</template>

<script>
import Plugin from '../../mixins/plugin'

export default {
  name: 'pip',
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.pip',
      npmVariables: undefined,
      registry: false,
      trustedHostList: []
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    ready () {
    },
    async applyBefore () {
    },
    async applyAfter () {
      await this.$api.plugin.pip.start()
      await this.$api.proxy.restart()
    },
    async onSwitchRegistry (event) {
      await this.setRegistry({ registry: event.target.value })
      this.$message.success('切换成功')
    },
    async setRegistry ({ registry }) {
      await this.apply()
      await this.$api.plugin.node.setRegistry({ registry })
    }

  }
}
</script>
<style lang="sass">
</style>
