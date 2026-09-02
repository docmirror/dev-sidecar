<script>
import { defineComponent } from 'vue';

import { PlusOutlined, MinusOutlined, SyncOutlined, CheckOutlined } from '@ant-design/icons-vue'
import Plugin from '../../mixins/plugin'

export default defineComponent({
  name: 'Overwall',
  components: { PlusOutlined, MinusOutlined, SyncOutlined, CheckOutlined },
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

  computed: {
    serverOptions () {
      const options = []
      const defaultServer = this.config?.plugin?.overwall?.serverDefault || {}
      for (const [domain, cfg] of Object.entries(defaultServer)) {
        options.push({
          id: cfg && cfg.id != null ? Number.parseInt(cfg.id, 10) : 0,
          domain,
          label: `ID 0（默认） - ${domain}`,
        })
      }
      for (const item of this.servers || []) {
        if (item.key) {
          options.push({
            id: item.id,
            domain: item.key,
            label: `ID ${item.id} - ${item.key}`,
          })
        }
      }
      return options
    },
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
      this.initServer()
      this.initTarget()
    },
    async applyBefore () {
      this.submitTarget()
      this.submitServer()
    },
    preferredServerId () {
      return this.serverOptions.some((item) => item.id === 1)
        ? 1
        : (this.serverOptions.some((item) => item.id === 0) ? 0 : null)
    },
    nextServerId () {
      const ids = (this.servers || []).map((item) => item.id).filter((id) => id != null)
      return ids.length > 0 ? Math.max(...ids) + 1 : 1
    },
    onTargetValueChange (item) {
      if (item.value === 'true' && (item.serverId == null || item.serverId === '')) {
        item.serverId = 'default'
      }
    },
    initTarget () {
      this.targets = []
      const targetsMap = this.config.plugin.overwall.targets || {}
      for (const key in targetsMap) {
        const value = targetsMap[key]
        if (value && typeof value === 'object') {
          this.targets.push({
            key: key || '',
            value: value.enabled === false ? 'false' : 'true',
            serverId: value.serverId != null ? Number.parseInt(value.serverId, 10) : 'default',
          })
        } else if (value === false || value === 'false') {
          this.targets.push({
            key: key || '',
            value: 'false',
            serverId: 'default',
          })
        } else {
          this.targets.push({
            key: key || '',
            value: 'true',
            serverId: 'default',
          })
        }
      }
    },
    addTarget () {
      this.targets.unshift({ key: '', value: 'true', serverId: 'default' })
      this.focusFirst(this.$refs.targets)
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
            if (item.value === 'true') {
              // 选择“默认”时不写死服务器，交给中间件动态选择：优先 ID1，否则 ID0
              if (item.serverId === 'default' || item.serverId == null || item.serverId === '') {
                map[hostname] = true
              } else {
                map[hostname] = { enabled: true, serverId: Number.parseInt(item.serverId, 10) }
              }
            } else {
              map[hostname] = false
            }
          }
        }
      }
      this.config.plugin.overwall.targets = map
    },

    initServer () {
      this.servers = []
      const serverMap = this.config.plugin.overwall.server || {}
      for (const key in serverMap) {
        const value = serverMap[key] || {}
        const id = value.id != null ? Number.parseInt(value.id, 10) : this.nextServerId()
        this.servers.push({
          id,
          key,
          value: {
            type: value.type || 'path',
            port: value.port,
            path: value.path,
            password: value.password,
          },
        })
      }
      if (this.servers.length === 0) {
        this.addServer(false)
      }
    },
    deleteServer (item, index) {
      this.servers.splice(index, 1)
    },
    addServer (needFocus = true) {
      this.servers.unshift({
        id: this.nextServerId(),
        key: '',
        value: { type: 'path', port: 443, path: '', password: '' },
      })
      if (needFocus) {
        this.focusFirst(this.$refs.servers)
      }
    },
    submitServer () {
      const map = {}
      for (const item of this.servers) {
        if (item.key) {
          const hostname = this.handleHostname(item.key)
          if (hostname) {
            map[hostname] = {
              id: item.id != null ? Number.parseInt(item.id, 10) : this.nextServerId(),
              type: item.value.type || 'path',
              port: item.value.port,
              path: item.value.path,
              password: item.value.password,
            }
          }
        }
      }
      this.config.plugin.overwall.server = map
    },
  },
});
</script>

<template>
  <ds-container>
    <template #header>
      梯子
    </template>
    <template #header-right>
      <a-button type="primary" @click="openExternal('https://github.com/docmirror/dev-sidecar-doc/blob/main/ow.md')">原理说明</a-button>
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
        <a-form-item label="梯子" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model:checked="config.plugin.overwall.enabled">
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
          <a-checkbox v-model:checked="config.plugin.overwall.pac.enabled">
            启用PAC
          </a-checkbox>
          <div class="form-help">
            PAC内收录了常见的被封杀的域名<br>当里面某些域名你不想被拦截时，你可以配置这些域名为<code>禁用</code>，也可以关闭PAC
          </div>
        </a-form-item>
        <a-form-item label="自动更新PAC" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model:checked="config.plugin.overwall.pac.autoUpdate">
            是否自动更新PAC
          </a-checkbox>
          <div class="form-help">
            开启自动更新后，启动代理服务时，将会异步从下面的远程地址下载PAC文件到本地。<br>
            注：只要下载成功后，即使关闭自动更新功能，也会优先读取最近下载的文件！
          </div>
        </a-form-item>
        <a-form-item label="远程PAC文件" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model:value="config.plugin.overwall.pac.pacFileUpdateUrl" :title="config.plugin.overwall.pac.pacFileUpdateUrl" spellcheck="false" />
          <div class="form-help">
            远程PAC文件内容可以是<code>base64</code>编码格式，也可以是未经过编码的
          </div>
        </a-form-item>
        <hr>
        <a-form-item label="自定义域名" :label-col="labelCol" :wrapper-col="wrapperCol" class="fine-tuning2">
          <div>
            <a-row :gutter="10" style="">
              <a-col :span="22">
                <span>PAC没有拦截到的域名，可以在此处定义；配置为<code>启用</code>时，可为该域名选择代理服务器，默认优先使用 <code>ID 1</code>，若 <code>ID 1</code> 不存在则自动使用 <code>ID 0</code>；配置为<code>禁用</code>时，将不使用增强功能</span>
              </a-col>
              <a-col :span="2">
                <a-button type="primary" @click="addTarget()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of targets" ref="targets" :key="index" :gutter="10">
              <a-col :span="12">
                <a-input v-model:value="item.key" class="mt-2" spellcheck="false" />
              </a-col>
              <a-col :span="4">
                <a-select v-model:value="item.value" class="w100" @change="onTargetValueChange(item)">
                  <a-select-option v-for="(item2) of overwallOptions" :key="item2.value" :value="item2.value">
                    {{ item2.label }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="6">
                <a-select v-model:value="item.serverId" class="w100" :disabled="item.value !== 'true'">
                  <a-select-option value="default">默认（优先 ID1，否则 ID0）</a-select-option>
                  <a-select-option v-for="(server) of serverOptions" :key="server.id" :value="server.id">
                    {{ server.label }}
                  </a-select-option>
                </a-select>
              </a-col>
              <a-col :span="2">
                <a-button type="danger" @click="deleteTarget(item, index)"><MinusOutlined /></a-button>
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
                <a-button type="primary" @click="addServer()"><PlusOutlined /></a-button>
              </a-col>
            </a-row>
            <a-row v-for="(item, index) of servers" ref="servers" :key="index" :gutter="10">
              <a-col :span="2">
                <a-tag color="blue">ID {{ item.id }}</a-tag>
              </a-col>
              <a-col :span="5">
                <a-input v-model:value="item.key" :title="item.key" addon-before="域名" placeholder="yourdomain.com" spellcheck="false" />
              </a-col>
              <a-col :span="5">
                <a-input v-model:value="item.value.port" :title="item.value.port" addon-before="端口" placeholder="443" spellcheck="false" />
              </a-col>
              <a-col :span="5">
                <a-input v-model:value="item.value.path" :title="item.value.path" addon-before="路径" placeholder="xxxxxx" spellcheck="false" />
              </a-col>
              <a-col :span="5">
                <a-input v-model:value="item.value.password" addon-before="密码" type="password" placeholder="password" spellcheck="false" />
              </a-col>
              <a-col :span="2">
                <a-button type="danger" @click="deleteServer(item, index)"><MinusOutlined /></a-button>
              </a-col>
            </a-row>
            <div class="form-help">
              <code>ID 0</code> 为内置默认服务器；在此处新增的服务器 ID 会依次为 <code>1、2、3...</code>。<br>
              您可以在此处配置自己的代理服务器地址。<br>
              警告：请勿使用来源不明的服务器地址，有安全风险！
            </div>
          </div>
        </a-form-item>
      </a-form>
    </div>
    <template #footer>
      <div class="footer-bar">
        <a-button :loading="resetDefaultLoading" class="mr10" @click="resetDefault()">
          <SyncOutlined />恢复默认
        </a-button>
        <a-button :loading="applyLoading" type="primary" @click="apply()">
          <CheckOutlined />应用
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
