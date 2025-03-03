<script>
import Plugin from '../../mixins/plugin'
import MockInput from '@/view/components/mock-input.vue'

export default {
  name: 'Overwall',
  components: { MockInput },
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.overwall',
      labelCol: { span: 4 },
      wrapperCol: { span: 20 },
      targets: undefined,
      servers: undefined,
      overwallOptions: [
        {
          label: '启用',
          value: 'true',
        },
        {
          label: '禁用',
          value: 'false',
        },
      ],
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
    async applyAfter () {
      if (this.status.server.enabled) {
        return this.$api.server.restart()
      }
    },
    ready () {
      this.initTarget()
      this.initServer()
    },
    async applyBefore () {
      this.submitTarget()
      this.submitServer()
    },
    initTarget () {
      this.targets = []
      const targetsMap = this.config.plugin.overwall.targets
      for (const key in targetsMap) {
        const value = targetsMap[key]
        this.targets.push({
          key: key || '',
          value: value === true ? 'true' : 'false',
        })
      }
    },
    addTarget () {
      this.targets.unshift({ key: '', value: 'true' })
    },
    deleteTarget (item, index) {
      this.targets.splice(index, 1)
    },
    submitTarget () {
      const map = {}
      for (const item of this.targets) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            map[hostname] = (item.value === 'true')
          }
        }
      }
      this.config.plugin.overwall.targets = map
    },

    initServer () {
      this.servers = []
      const targetsMap = this.config.plugin.overwall.server
      for (const key in targetsMap) {
        const value = targetsMap[key]
        this.servers.push({
          key,
          value,
        })
      }
      if (this.servers.length === 0) {
        this.addServer()
      }
    },
    deleteServer (item, index) {
      this.servers.splice(index, 1)
    },
    addServer () {
      this.servers.unshift({ key: '', value: { type: 'path' } })
    },
    submitServer () {
      const map = {}
      for (const item of this.servers) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            map[hostname] = item.value
          }
        }
      }
      this.config.plugin.overwall.server = map
    },
  },
}
</script>

<template>
  <ds-container>
    <template slot="header">
      梯子
    </template>
    <template slot="header-right">
      <a-button type="primary" @click="openExternal('https://github.com/docmirror/dev-sidecar-doc/blob/main/ow.md')">原理说明</a-button>
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
        <a-form-item label="梯子" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.overwall.enabled">
            启用
          </a-checkbox>
          <div class="form-help">
            这是什么功能？你懂的！偷偷的用，别声张。<code><i>注：请不要看视频，流量挺小的！</i></code><br>
            建议参照右上角的<code>原理说明</code>，自建二层代理服务端，并在此页下方配置<code>代理服务端</code>。<br>
            声明：此功能仅供技术学习与探讨！
          </div>
        </a-form-item>
        <hr>
        <a-form-item label="PAC" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.overwall.pac.enabled">
            启用PAC
          </a-checkbox>
          <div class="form-help">
            PAC内收录了常见的被封杀的域名<br>当里面某些域名你不想被拦截时，你可以配置这些域名为<code>禁用</code>，也可以关闭PAC
          </div>
        </a-form-item>
        <a-form-item label="自动更新PAC" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.overwall.pac.autoUpdate">
            是否自动更新PAC
          </a-checkbox>
          <div class="form-help">
            开启自动更新后，启动代理服务时，将会异步从下面的远程地址下载PAC文件到本地。<br>
            注：只要下载成功后，即使关闭自动更新功能，也会优先读取最近下载的文件！
          </div>
        </a-form-item>
        <a-form-item label="远程PAC文件" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model="config.plugin.overwall.pac.pacFileUpdateUrl" :title="config.plugin.overwall.pac.pacFileUpdateUrl" spellcheck="false" />
          <div class="form-help">
            远程PAC文件内容可以是<code>base64</code>编码格式，也可以是未经过编码的
          </div>
        </a-form-item>
        <hr>
        <a-form-item label="自定义域名" :label-col="labelCol" :wrapper-col="wrapperCol" class="fine-tuning2">
          <div>
            <a-row :gutter="10" style="">
              <a-col :span="22">
                <span>PAC没有拦截到的域名，可以在此处定义；配置为<code>禁用</code>时，将不使用梯子</span>
              </a-col>
              <a-col :span="2">
                <a-button type="primary" icon="plus" @click="addTarget()" />
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of targets" :key="index" :gutter="10">
              <a-col :span="18">
                <MockInput v-model="item.key" class="mt-2" />
              </a-col>
              <a-col :span="4">
                <a-select v-model="item.value" style="width:100%">
                  <a-select-option v-for="(item2) of overwallOptions" :key="item2.value" :value="item2.value">
                    {{ item2.label }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="2">
                <a-button type="danger" icon="minus" @click="deleteTarget(item, index)" />
              </a-col>
            </a-row>
          </div>
        </a-form-item>
        <a-form-item label="代理服务端" :label-col="labelCol" :wrapper-col="wrapperCol">
          <div>
            <a-row :gutter="10" style="">
              <a-col :span="22">
                <span>Nginx二层代理服务端配置</span>
              </a-col>
              <a-col :span="2">
                <a-button type="primary" icon="plus" @click="addServer()" />
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of servers" :key="index" :gutter="10">
              <a-col :span="6">
                <a-input v-model="item.key" :title="item.key" addon-before="域名" placeholder="yourdomain.com" spellcheck="false" />
              </a-col>
              <a-col :span="5">
                <a-input v-model="item.value.port" :title="item.value.port" addon-before="端口" placeholder="443" spellcheck="false" />
              </a-col>
              <a-col :span="6">
                <a-input v-model="item.value.path" :title="item.value.path" addon-before="路径" placeholder="xxxxxx" spellcheck="false" />
              </a-col>
              <a-col :span="5">
                <a-input v-model="item.value.password" addon-before="密码" type="password" placeholder="password" spellcheck="false" />
              </a-col>
              <a-col :span="2">
                <a-button type="danger" icon="minus" @click="deleteServer(item, index)" />
              </a-col>
            </a-row>
            <div class="form-help">
              您可以在此处配置自己的代理服务器地址。<br>
              警告：请勿使用来源不明的服务器地址，有安全风险！
            </div>
          </div>
        </a-form-item>
      </a-form>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button :loading="resetDefaultLoading" class="mr10" icon="sync" @click="resetDefault()">
          恢复默认
        </a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">
          应用
        </a-button>
      </div>
    </template>
  </ds-container>
</template>

<style lang="scss">
/*样式微调*/
.fine-tuning2 .ant-btn-danger {
  margin-top: 2px !important;
}
.ant-input-group-addon:first-child {
  padding: 0 5px !important;
}
</style>
