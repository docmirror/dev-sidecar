<template>
  <ds-container>
    <template slot="header">
      NPM加速
      <span style="color:#999;">
        由于nodejs不走系统证书，所以npm加速不是很好用，可以用淘宝registry
      </span>
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
        <a-form-item label="启用NPM代理" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.node.enabled">
            随应用启动
          </a-checkbox>
          <a-tag v-if="status.plugin.node.enabled" color="green">
            当前已启动
          </a-tag>
          <a-tag v-else color="red">
            当前未启动
          </a-tag>
        </a-form-item>
        <a-form-item label="SSL校验" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.node.setting['strict-ssl']">
            关闭strict-ssl
          </a-checkbox>
          npm代理启用后必须关闭
        </a-form-item>
        <a-form-item label="npm仓库镜像" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-radio-group v-model="config.plugin.node.setting.registry" @change="onSwitchRegistry"
                         default-value="https://registry.npmjs.org" button-style="solid">
            <a-radio-button value="https://registry.npmjs.org">
              npmjs原生
            </a-radio-button>
            <a-radio-button value="https://registry.npmmirror.com">
              taobao镜像
            </a-radio-button>
          </a-radio-group>
          <div class="form-help">设置后立即生效，即使关闭ds也会继续保持</div>
        </a-form-item>

        <a-form-item label="yarn仓库镜像" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-radio-group v-model="config.plugin.node.setting.yarnRegistry" :default-value="null"  @change="onSwitchYarnRegistry" button-style="solid">
            <a-radio-button :value="null">
              yarn原生
            </a-radio-button>
            <a-radio-button value="https://registry.npmmirror.com">
              taobao镜像
            </a-radio-button>
          </a-radio-group>
          <div class="form-help">设置后立即生效，即使关闭ds也会继续保持</div>
        </a-form-item>

        <a-form-item label="镜像变量设置" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.node.startup.variables">
            自动设置，启动npm加速开关时将会设置如下环境变量
          </a-checkbox>
          <div class="form-help">某些库需要自己设置镜像变量，才能下载，比如：electron</div>
          <a-row :gutter="10" style="margin-top: 10px" v-for="(item,index) of npmVariables" :key='index'>
            <a-col :span="10">
              <a-input :disabled="item.key ===false" v-model="item.key"></a-input>
            </a-col>
            <a-col :span="10">
              <a-input :disabled="item.value ===false" v-model="item.value"></a-input>
            </a-col>
            <a-col :span="4">
              <a-icon v-if="item.exists&& item.hadSet" title="已设置" style="color:green" type="check"/>
              <a-icon v-else title="还未设置" style="color:red" type="exclamation-circle"/>
            </a-col>
          </a-row>
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
  name: 'Node',
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.node',
      npmVariables: undefined,
      registry: false
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    ready () {
      return this.$api.plugin.node.getVariables().then(ret => {
        console.log('variables', ret)
        this.npmVariables = ret
      })
    },
    async onSwitchRegistry (event) {
      await this.setRegistry({ registry: event.target.value, type: 'npm' })
      this.$message.success('切换成功')
    },
    async onSwitchYarnRegistry (event) {
      const registry = event.target.value
      console.log('registry', registry)
      await this.setRegistry({ registry, type: 'yarn' })
      this.$message.success('切换成功')
    },
    async setRegistry ({ registry, type }) {
      this.apply()
      console.log('type', type)
      await this.$api.plugin.node.setRegistry({ registry, type })
    },
    setNpmVariableAll () {
      this.saveConfig().then(() => {
        this.$api.plugin.node.setVariables()
      })
    }
  }
}
</script>
<style lang="sass">
</style>
