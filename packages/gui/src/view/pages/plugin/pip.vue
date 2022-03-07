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
        <a-form-item label="pip命令名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model="config.plugin.pip.setting.command"></a-input>
          <div class="form-help">如果你的pip命令改成了其他名字（如pip3），可以在此处修改</div>
        </a-form-item>
        <a-form-item label="仓库镜像" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-radio-group v-model="config.plugin.pip.setting.registry" @change="onSwitchRegistry"
                         default-value="https://pypi.org/simple/" button-style="solid">
            <a-radio-button value="https://pypi.org/simple/">
              原生
            </a-radio-button>
            <a-radio-button value="https://mirrors.aliyun.com/pypi/simple/">
              aliyun镜像
            </a-radio-button>
          </a-radio-group>
          <div class="form-help">设置后立即生效，即使关闭ds也会继续保持</div>
        </a-form-item>
        <a-form-item label="信任仓库域名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model="config.plugin.pip.setting.trustedHost"></a-input>
          <div class="form-help">注意：切换仓库镜像同时会修改pip.ini中的trusted-host配置</div>
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
      this.config.plugin.pip.setting.registry = registry
      const domain = registry.substring(registry.indexOf('//') + 2, registry.indexOf('/', 8))
      this.config.plugin.pip.setting.trustedHost = domain
      await this.apply()
    }

  }
}
</script>
<style lang="sass">
</style>
