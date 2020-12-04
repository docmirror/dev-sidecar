<template>
  <ds-container>
    <template slot="header">
      NPM加速
      <span>
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
        <a-form-item label="切换registry" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-radio-group v-model="config.plugin.node.setting.registry" @change="onSwitchRegistry"
                         default-value="https://registry.npmjs.org" button-style="solid">
            <a-radio-button value="https://registry.npmjs.org">
              npmjs
            </a-radio-button>
            <a-radio-button value="https://registry.npm.taobao.org">
              taobao
            </a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="镜像变量设置" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.node.startup.variables">
            自动设置
          </a-checkbox>
          <div>某些库需要自己设置镜像变量，才能下载，比如：electron</div>
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
      await this.setRegistry(event.target.value)
      this.$message.success('切换成功')
    },
    async setRegistry (registry) {
      this.apply()
      await this.$api.plugin.node.setRegistry(registry)
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
