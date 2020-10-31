<template>
  <ds-container>
    <template slot="header">
      系统代理设置
      <span>
      </span>
    </template>

    <div v-if="config">
      <a-form-item label="启用系统代理" >
        <a-checkbox v-model="config.proxy.enabled" >
          自动开启系统代理
        </a-checkbox>
        当前状态：
        <a-tag v-if="status.plugin.node.enabled" color="green">
          已启动
        </a-tag>
      </a-form-item>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button  type="primary" @click="submit()">应用</a-button>
      </div>
    </template>
  </ds-container>

</template>

<script>
import DsContainer from '../components/container'
import api from '../api'
import status from '../status'
export default {
  name: 'Proxy',
  components: {
    DsContainer
  },
  data () {
    return {
      config: undefined,
      status: status
    }
  },
  created () {
    api.config.reload().then(ret => {
      this.config = ret
    })
  },
  mounted () {
  },
  methods: {

    submit () {
      api.config.set(this.config).then(() => {
        this.$message.info('设置已保存')
      })
    }
  }
}
</script>
<style lang="sass">
</style>
