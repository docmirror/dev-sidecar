<template>
  <ds-container>
    <template slot="header">
      NPM加速
      <span>
      </span>
    </template>

    <div v-if="config">
      <div>
        <a-form-item label="启用NPM加速插件" >
          <a-checkbox v-model="config.plugin.node.enabled" >
            自动开启NPM加速
          </a-checkbox>
          当前状态：
          <a-tag v-if="status.plugin.node.enabled" color="green">
            已启动
          </a-tag>
        </a-form-item>

        <a-form-item label="切换registry" >
          <a-radio-group v-model="config.plugin.node.setting.registry" @change="onSwitchRegistry" default-value="https://registry.npmjs.org" button-style="solid">
            <a-radio-button value="https://registry.npmjs.org">
              npmjs
            </a-radio-button>
            <a-radio-button value="https://registry.npm.taobao.org">
              taobao
            </a-radio-button>
          </a-radio-group>
        </a-form-item>
      </div>

      <div>
        <div>某些库需要自己设置镜像变量，才能下载，比如：electron</div>
        <a-row :gutter="10" style="margin-top: 10px" v-for="(item,index) of npmVariables" :key = 'index'>
          <a-col :span="10">
            <a-input :disabled="item.key ===false" v-model="item.key"></a-input>
          </a-col>
          <a-col :span="10">
            <a-input :disabled="item.value ===false" v-model="item.value"></a-input>
          </a-col>
          <a-col :span="4">
            <a-icon v-if="item.exists" style="color:green" type="check" />
            <a-icon v-if="!item.exists || !item.set" title="还未设置" style="color:red" type="exclamation-circle" />
          </a-col>
        </a-row>
      </div>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button  type="primary" @click="submit()">应用</a-button>
      </div>
    </template>
  </ds-container>

</template>

<script>
import DsContainer from '../../components/container'
import api from '../../api'
import status from '../../status'
export default {
  name: 'Node',
  components: {
    DsContainer
  },
  data () {
    return {
      config: undefined,
      status: status,
      npmVariables: undefined,
      registry: false
    }
  },
  created () {
    api.config.reload().then(ret => {
      this.config = ret
    })
    api.plugin.node.getVariables().then(ret => {
      this.npmVariables = ret
    })
  },
  mounted () {
  },
  methods: {

    onSwitchRegistry (event) {
      return this.setRegistry(event.target.value).then(() => {
        this.$message.success('切换成功')
      })
    },
    setRegistry (registry) {
      return api.plugin.node.setRegistry(registry)
    },
    submit () {
      return api.config.set(this.config).then(() => {
        this.$message.success('设置已保存')
      })
    }
  }
}
</script>
<style lang="sass">
</style>
