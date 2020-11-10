<template>
  <ds-container>
    <template slot="header">
      给开发者的辅助工具
      <span>
          <a-button style="margin-right:10px" @click="openSetupCa">安装根证书</a-button>
         <a-badge :count="update.newVersion?1:0" dot>
          <a-button style="margin-right:10px" @click="doCheckUpdate">检查更新</a-button>
         </a-badge>
      </span>
    </template>

    <div v-if="status" style="display: flex; align-items:center;justify-content:space-around;flex-direction: row">
      <div style="text-align: center">
        <div class="big_button">
          <a-button shape="circle" :type="startup.type()" :loading="startup.loading" @click="startup.doClick">
            <img v-if="!startup.loading && !status.server.enabled" width="50" src="/logo/logo-simple.svg">
            <img v-if="!startup.loading && status.server.enabled" width="50" src="/logo/logo-fff.svg">
          </a-button>
          <div style="margin-top: 10px">{{ status.server.enabled ? '已开启' : '已关闭' }}</div>
        </div>
      </div>
      <div :span="12">
        <a-form style="margin-top:20px" :label-col="{ span: 12 }" :wrapper-col="{ span: 12 }">

          <a-form-item v-for=" (item, key) in switchBtns" :key="key" :label="item.label">
            <a-switch style="margin-left:10px" :loading="item.loading" v-model="item.status[key].enabled" default-checked v-on:click="item.doClick">
              <a-icon slot="checkedChildren" type="check"/>
              <a-icon slot="unCheckedChildren" type="close"/>
            </a-switch>
          </a-form-item>

        </a-form>

      </div>

    </div>
    <setup-ca title="安装证书" :visible.sync="setupCa.visible"></setup-ca>
  </ds-container>

</template>

<script>
import lodash from 'lodash'
import setupCa from '../components/setup-ca'
import DsContainer from '../components/container'

export default {
  name: 'Index',
  components: {
    DsContainer,
    setupCa
  },
  data () {
    return {
      status: undefined,
      startup: {
        loading: false,
        type: () => {
          return (this.status.server && this.status.server.enabled) ? 'primary' : 'default'
        },
        doClick: () => {
          if (this.status.server.enabled) {
            this.apiCall(this.startup, this.$api.shutdown)
          } else {
            this.apiCall(this.startup, this.$api.startup)
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
      switchBtns: undefined,
      config: undefined,
      setupCa: {
        visible: false
      },
      update: {}
    }
  },
  async created () {
    console.log('index created', this.status, this.$status)
    await this.reloadConfig()
    const status = await this.$api.status.get()
    console.log('status', status)
    this.$set(this, 'status', status)
    this.switchBtns = this.createSwitchBtns()
    console.log('switchBtns', this.switchBtns)
    if (this.$global.update == null) {
      this.$global.update = {
        fromUser: false,
        autoDownload: true,
        progress: 0,
        newVersion: false
      }
      this.update = this.$global.update
      this.doCheckUpdate(false)
    }
    this.update = this.$global.update
  },
  mounted () {
    console.log('index mounted')
  },
  methods: {
    reloadConfig () {
      return this.$api.config.reload().then(ret => {
        this.config = ret
        return ret
      })
    },
    createSwitchBtns () {
      console.log('api,', this.$api)
      const btns = {}
      const status = this.status
      btns.server = this.createSwitchBtn('server', '代理服务', this.$api.server, status)
      btns.proxy = this.createSwitchBtn('proxy', '系统代理', this.$api.proxy, status)
      lodash.forEach(status.plugin, (item, key) => {
        btns[key] = this.createSwitchBtn(key, this.config.plugin[key].name, this.$api.plugin[key], status.plugin)
      })
      return btns
    },
    createSwitchBtn (key, label, apiTarget, statusParent) {
      return {
        loading: false,
        key: key,
        label: label,
        status: statusParent,
        doClick: (checked) => {
          this.onSwitchClick(this.switchBtns[key], apiTarget.start, apiTarget.close, checked)
        }
      }
    },
    async apiCall (btn, api, param) {
      btn.loading = true
      try {
        const ret = await api(param)
        console.log('this status', this.status)
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
      return this.onSwitchClick(this.server, this.$api.server.start, this.$api.server.close, checked)
    },
    start (checked) {
      this.apiCall(this.startup, this.$api.startup)
    },
    openSettings () {
      this.settings.visible = true
    },
    onConfigChanged (newConfig) {
      console.log('config changed', newConfig)
      this.reloadConfig().then(() => {
        if (this.status.server) {
          return this.$api.server.restart()
        }
      })
    },
    openSetupCa () {
      this.setupCa.visible = true
    },
    doCheckUpdate (fromUser = true) {
      this.update.fromUser = fromUser
      this.$api.update.checkForUpdate(this.update)
    }
  }
}
</script>
<style>
.page_index {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  padding-top: 60px;
}

.big_button > button {
  width: 100px;
  height: 100px;
  border-radius: 100px;
}

.big_button > button i {
  size: 40px
}

div.ant-form-item {
  margin-bottom: 10px;
}

</style>
