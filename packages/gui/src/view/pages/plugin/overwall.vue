<template>
  <ds-container>
    <template slot="header">
      梯子
      <span>
           <a-button type="primary" @click="openExternal('https://github.com/docmirror/dev-sidecar-doc/blob/main/ow.md')">原理说明</a-button>
      </span>
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
        <a-form-item label="梯子" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.overwall.enabled">
            启用
          </a-checkbox>
          <div>这是什么功能？你懂的！偷偷的用，别声张。(不要看视频，流量挺小的。)</div>
          <div>建议按右上角“说明”自建服务端</div>
          <div>仅供技术学习与探讨</div>
        </a-form-item>
        <a-form-item label="PAC" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.overwall.pac.enabled">
            启用PAC
          </a-checkbox>
        </a-form-item>
        <a-form-item label="自定义域名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <div>
            <a-row :gutter="10" style="">
              <a-col :span="22">
                <span>PAC没有拦截到的域名，可以在此处定义</span>
              </a-col>
              <a-col :span="2">
                <a-button  type="primary" icon="plus" @click="addTarget()" />
              </a-col>
            </a-row>
            <a-row :gutter="10"  v-for="(item,index) of targets" :key = 'index'>
              <a-col :span="22">
                <a-input  v-model="item.key"></a-input>
              </a-col>
              <a-col :span="2">
                <a-button  type="danger" icon="minus" @click="deleteTarget(item,index)" />
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
                <a-button  type="primary" icon="plus" @click="addServer()" />
              </a-col>
            </a-row>
            <a-row :gutter="10"  v-for="(item,index) of servers" :key = 'index'>
              <a-col :span="6">
                <a-input addon-before="域名"  placeholder="yourdomain.com"  v-model="item.key"/>
              </a-col>
              <a-col :span="5">
                <a-input addon-before="端口"  placeholder="443"  v-model="item.value.port"/>
              </a-col>
              <a-col :span="6">
                <a-input addon-before="路径"  placeholder="xxxxxx"  v-model="item.value.path"/>
              </a-col>
              <a-col :span="5">
                <a-input addon-before="密码" type="password" placeholder="password" v-model="item.value.password"/>
              </a-col>
              <a-col :span="2">
                <a-button  type="danger" icon="minus" @click="deleteServer(item,index)" />
              </a-col>
            </a-row>
            <div>您可以在此处配置你自己的服务器地址</div>
          </div>
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
  name: 'Overwall',
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.overwall',
      targets: undefined,
      servers: undefined
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    openExternal (url) {
      this.$api.ipc.openExternal(url)
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
      this.saveTarget()
      this.saveServer()
    },
    initTarget () {
      this.targets = []
      const targetsMap = this.config.plugin.overwall.targets
      for (const key in targetsMap) {
        const value = targetsMap[key]
        this.targets.push({
          key, value
        })
      }
    },
    deleteTarget (item, index) {
      this.targets.splice(index, 1)
    },
    addTarget () {
      this.targets.unshift({ key: '', value: true })
    },
    saveTarget () {
      const map = {}
      for (const item of this.targets) {
        if (item.key) {
          map[item.key] = item.value
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
          key, value
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
    saveServer () {
      const map = {}
      for (const item of this.servers) {
        if (item.key) {
          map[item.key] = item.value
        }
      }
      this.config.plugin.overwall.server = map
    }

  }
}
</script>
<style lang="sass">
</style>
