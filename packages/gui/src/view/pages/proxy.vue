<template>
  <ds-container>
    <template slot="header">
      系统代理设置
      <span>
      </span>
    </template>

    <div v-if="config">
      <a-form-item label="启用系统代理" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.proxy.enabled" >
          随应用启动
        </a-checkbox>
        <a-tag v-if="status.proxy.enabled" color="green">
          当前已启动
        </a-tag>
        <a-tag v-else color="red">
          当前未启动
        </a-tag>
      </a-form-item>
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
import Plugin from '../mixins/plugin'
export default {
  name: 'Proxy',
  mixins: [Plugin],
  data () {
    return {
      key: 'proxy'
    }
  },
  created () {

  },
  mounted () {
  },
  methods: {

  }
}
</script>
<style lang="sass">
</style>
