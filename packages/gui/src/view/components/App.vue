<template>
  <div id="app">
    <template>
      <div style="margin:auto">
        <div style="text-align: center"><img height="80px" src="/logo/logo-lang.svg"></div>
        <a-card title="给开发者的辅助工具" style="width: 500px;margin:auto">
          <div style="display: flex; align-items:center;justify-content:space-around;flex-direction: row">
            <div style="text-align: center">
              <div class="big_button" >
                <a-button shape="circle"  :type="startup.type()" :loading="startup.loading" @click="startup.doClick"  >
                  <img v-if="!startup.loading && !status.server" width="50" src="/logo/logo-simple.svg">
                 <img v-if="!startup.loading && status.server" width="50" src="/logo/logo-fff.svg">
                </a-button>
                <div style="margin-top: 10px">{{status.server?'已开启':'已关闭'}}</div>
              </div>
            </div>
            <div :span="12">
              <a-form  style="margin-top:20px" :label-col="{ span: 12 }" :wrapper-col="{ span: 12 }" >
                <a-form-item label="代理服务">
                  <a-switch :loading="server.loading" v-model="status.server"  default-checked   v-on:click="server.doClick">
                    <a-icon slot="checkedChildren" type="check" />
                    <a-icon slot="unCheckedChildren" type="close" />
                  </a-switch>
                </a-form-item>

                <a-form-item v-for=" (item, key) in proxy" :key="key"  :label="_lang(key,langSetting.proxy) ">
                  <a-switch :loading="item.loading" v-model="status.proxy[key]"  default-checked   v-on:click="item.doClick">
                    <a-icon slot="checkedChildren" type="check" />
                    <a-icon slot="unCheckedChildren" type="close" />
                  </a-switch>
                </a-form-item>

              </a-form>

            </div>
          </div>

           <span  slot="extra" >
                <a-button style="margin-right:10px" @click="openSetupCa" >安装根证书</a-button>
                <a-button v-if="config" @click="openSettings" icon="setting" ></a-button>
           </span>
        </a-card>

        <setup-ca title="安装证书" :visible.sync="setupCa.visible"></setup-ca>
        <settings  v-if="config" title="设置" :config="config" :visible.sync="settings.visible"  @change="onConfigChanged"></settings>
      </div>
    </template>
  </div>
</template>

<script>
import api from '../api'
import status from '../status'
import lodash from 'lodash'
import Settings from './settings'
import setupCa from './setup-ca'
export default {
  name: 'App',
  components: {
    Settings, setupCa
  },
  data () {
    return {
      langSetting: {
        proxy: {
          system: '系统代理',
          npm: 'npm代理',
          yarn: 'yarn代理'
        }
      },
      status: status,
      startup: {
        loading: false,
        type: () => {
          return this.status.server ? 'primary' : 'default'
        },
        doClick: () => {
          if (this.status.server) {
            this.apiCall(this.startup, api.shutdown)
          } else {
            this.apiCall(this.startup, api.startup)
          }
        }
      },
      server: {
        key: '代理服务',
        loading: false,
        doClick: (checked) => {
          this.onServerClick(checked)
        }
      },
      proxy: undefined,
      config: undefined,
      settings: {
        visible: false
      },
      setupCa: {
        visible: false
      }
    }
  },
  computed: {
    _intercepts () {
      return this.config.intercepts
    }
  },
  created () {
    this.proxy = this.createProxyBtns()
    this.reloadConfig().then(() => {
      this.start(true)
      console.log('proxy', this.proxy)
    })
  },
  methods: {
    reloadConfig () {
      return api.config.reload().then(ret => {
        console.log('config', ret)
        this.config = ret
        return ret
      })
    },
    _lang (key, parent) {
      const label = parent ? lodash.get(parent, key) : lodash.get(this.langSetting, key)
      if (label) {
        return label
      }
      return key
    },
    createProxyBtns () {
      const btns = {}
      console.log('api.proxy', api.proxy, api)
      for (const type in api.proxy) {
        btns[type] = {
          loading: false,
          key: type,
          doClick: (checked) => {
            this.onSwitchClick(this.proxy[type], api.proxy[type].open, api.proxy[type].close, checked)
          }
        }
      }
      return btns
    },
    async apiCall (btn, api, param) {
      btn.loading = true
      try {
        const ret = await api(param)
        return ret
      } catch (err) {
        console.log('api invoke error:', err)
      } finally {
        btn.loading = false
      }
    },

    onSwitchClick (btn, openApi, closeApi, checked) {
      if (checked) {
        return this.apiCall(btn, openApi)
      } else {
        return this.apiCall(btn, closeApi)
      }
    },
    onServerClick (checked) {
      return this.onSwitchClick(this.server, api.server.start, api.server.close, checked)
    },
    start (checked) {
      this.apiCall(this.startup, api.startup)
    },
    openSettings () {
      this.settings.visible = true
    },
    onConfigChanged (newConfig) {
      console.log('config chagned', newConfig)
      this.reloadConfig().then(() => {
        if (this.status.server) {
          return api.server.restart()
        }
      })
    },
    openSetupCa () {
      this.setupCa.visible = true
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  padding-top:60px;
}

.big_button >button{
  width:100px;
  height:100px;
  border-radius: 100px;
}
.big_button >button i{
  size:40px
}
div.ant-form-item{
  margin-bottom: 10px;
}
</style>
