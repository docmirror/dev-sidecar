<script>
import Plugin from '../../mixins/plugin'
import MockInput from '@/view/components/mock-input.vue'

export default {
  name: 'Git',
  components: { MockInput },
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.git',
      noProxyUrls: [],
      needRestart: false,
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    ready () {
      this.initNoProxyUrls()
    },
    async applyBefore () {
      if (this.status.plugin.git.enabled) {
        await this.$api.plugin.git.close()
        this.needRestart = true
      } else {
        this.needRestart = false
      }
      this.submitNoProxyUrls()
    },
    async applyAfter () {
      if (this.needRestart) {
        await this.$api.plugin.git.start()
      }
    },
    initNoProxyUrls () {
      this.noProxyUrls = []
      for (const key in this.config.plugin.git.setting.noProxyUrls) {
        const value = this.config.plugin.git.setting.noProxyUrls[key]
        this.noProxyUrls.push({
          key,
          value,
        })
      }
    },
    addNoProxyUrl () {
      this.noProxyUrls.unshift({ key: '' })
    },
    delNoProxyUrl (item, index) {
      this.noProxyUrls.splice(index, 1)
    },
    submitNoProxyUrls () {
      const noProxyUrls = {}
      for (const item of this.noProxyUrls) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            noProxyUrls[hostname] = true
          }
        }
      }
      this.config.plugin.git.setting.noProxyUrls = noProxyUrls
    },
  },
}
</script>

<template>
  <ds-container>
    <template slot="header">
      Git.exe代理设置
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
        <a-form-item label="排除仓库地址" :label-col="labelCol" :wrapper-col="wrapperCol">
          <div>
            <a-row :gutter="10">
              <a-col :span="22">
                <span><code>Git.exe</code>将不代理以下仓库；可以是根地址、组织/机构地址、完整地址</span>
              </a-col>
              <a-col :span="2">
                <a-button type="primary" icon="plus" @click="addNoProxyUrl()" />
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of noProxyUrls" :key="index" :gutter="10">
              <a-col :span="22" class="fine-tuning">
                <MockInput v-model="item.key" />
              </a-col>
              <a-col :span="2">
                <a-button type="danger" icon="minus" @click="delNoProxyUrl(item, index)" />
              </a-col>
            </a-row>
          </div>
        </a-form-item>
      </a-form>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button :loading="resetDefaultLoading" class="md-mr-10" icon="sync" @click="resetDefault()">
          恢复默认
        </a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">
          应用
        </a-button>
      </div>
    </template>
  </ds-container>
</template>
