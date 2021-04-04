<template>
  <ds-container>
    <template slot="header">
      Git代理设置
      <span style="color:#999;">
        仅针对git命令行的代理设置，github网站的访问无需设置
      </span>
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
        <a-form-item label="启用Git代理" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.git.enabled">
            随应用启动
          </a-checkbox>
          <a-tag v-if="status.plugin.git.enabled" color="green">
            当前已启动
          </a-tag>
          <a-tag v-else color="red">
            当前未启动
          </a-tag>
        </a-form-item>
        <a-form-item label="SSL校验" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.git.setting.sslVerify">
            关闭sslVerify
          </a-checkbox>
          安装Git时未选择使用系统证书管理服务时必须关闭
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
  name: 'Git',
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.git'
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    ready () {
    }
  }
}
</script>
