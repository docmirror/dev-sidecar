<template>
  <ds-container class="page_index">
    <template slot="header">
      给开发者的辅助工具
      <span>

          <a-button style="margin-right:10px" @click="openSetupCa">
            <a-badge :count="_rootCaSetuped?0:1" dot>安装根证书 </a-badge>
          </a-button>

          <a-button style="margin-right:10px" @click="doCheckUpdate(true)" :loading="update.downloading"
                    :title="'当前版本:'+info.version">
            <a-badge :count="update.newVersion?1:0" dot>
              <span v-if="update.downloading">{{ update.progress }}%</span>{{ update.downloading ? '新版本下载中' : '检查更新' }}
            </a-badge>
          </a-button>

      </span>
    </template>

    <div class="box">
      <a-alert v-if="config && config.app.showShutdownTip" message="本应用开启后会修改系统代理，直接重启电脑可能会无法上网，您可以再次启动本应用即可恢复。如您需要卸载，在卸载前请务必完全退出本应用再进行卸载" banner closable @close="onShutdownTipClose"/>
      <div class="mode-bar" style="margin:20px;" v-if="config && config.app">
        <a-radio-group v-model="config.app.mode" button-style="solid" @change="modeChange">
          <a-tooltip placement="topLeft" title="启用测速，关闭拦截，关闭增强（不稳定，不需要安装证书，最安全）">
            <a-radio-button value="safe">
              安全模式
            </a-radio-button>
          </a-tooltip>
          <a-tooltip placement="topLeft" title="启用测速，启用拦截，关闭增强（需要安装证书）">
            <a-radio-button value="default">
              默认模式
            </a-radio-button>
          </a-tooltip>
          <a-tooltip v-if="setting.overwall" placement="topLeft" title="一个简单的梯子（敏感原因，默认隐藏，更多信息请点击左侧增强功能菜单）">
            <a-radio-button value="ow">
              增强模式
            </a-radio-button>
          </a-tooltip>
          <a-tooltip v-else placement="topLeft" title="这个页面有个彩蛋">
            <a-radio-button :disabled="true" value="ow">
              彩蛋
            </a-radio-button>
          </a-tooltip>
        </a-radio-group>
      </div>

      <div v-if="status"
           style="margin-top:20px;display: flex; align-items:center;justify-content:space-around;flex-direction: row">

        <div style="text-align: center">
          <div class="big_button">
            <a-button shape="circle" :type="startup.type()" :loading="startup.loading" @click="startup.doClick">
              <img v-if="!startup.loading && !status.server.enabled" width="50" src="/logo/logo-simple.svg">
              <img v-if="!startup.loading && status.server.enabled" width="50" src="/logo/logo-fff.svg">
            </a-button>
            <div class="mt10">{{ status.server.enabled ? '已开启' : '已关闭' }}</div>

          </div>
        </div>
        <div :span="12">
          <a-form style="margin-top:20px" :label-col="{ span: 12 }" :wrapper-col="{ span: 12 }">

            <a-form-item v-for=" (item, key) in switchBtns" :key="key" :label="item.label">
              <a-tooltip placement="topLeft" :title="item.tip">
                <a-switch style="margin-left:10px" :loading="item.loading" :checked="item.status()" default-checked
                          @change="item.doClick">
                  <a-icon slot="checkedChildren" type="check"/>
                  <a-icon slot="unCheckedChildren" type="close"/>
                </a-switch>
              </a-tooltip>
            </a-form-item>
          </a-form>
        </div>
      </div>

    </div>

    <setup-ca title="安装证书" :visible.sync="setupCa.visible" @setup="handleCaSetuped"></setup-ca>
    <div slot="footer">
      <div class="star" v-if="setting && !setting.overwall">
        <div class="donate">
          <a-tooltip placement="topLeft" title="彩蛋，点我">
            <span style="display: block;width:100px;height:50px;" @click="wantOW()"></span>
          </a-tooltip>
        </div>
        <div class="right"></div>
      </div>
      <div class="star" >
        <div class="donate" @click="donateModal=true">
          <a-icon type="like" theme="outlined"/>
          捐赠
        </div>
        <div class="right">
          <div>如果它解决了你的问题，请不要吝啬你的star哟！点这里
            <a-icon style="margin-right:10px;" type="arrow-right" theme="outlined"/>
          </div>
          <a @click="openExternal('https://gitee.com/docmirror/dev-sidecar')"><img
            src='https://gitee.com/docmirror/dev-sidecar/badge/star.svg?theme=dark' alt='star'/></a>
          <a @click="openExternal('https://github.com/docmirror/dev-sidecar')"><img alt="GitHub stars"
                                                                                    src="https://img.shields.io/github/stars/docmirror/dev-sidecar?logo=github"></a>
        </div>
      </div>

      <a-modal title="捐赠" v-model="donateModal" width="550px" cancelText="不了" okText="果断支持" @ok="goDonate">
        <div>* 本应用完全免费，如果觉得好用，可以给予捐赠。</div>
        <div>* 开源项目持续发展离不开您的支持，感谢</div>
        <div class="payQrcode">
          <img height="200px" src="/pay.jpg"/>
        </div>
      </a-modal>
    </div>

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
  computed: {
    _rootCaSetuped () {
      if (this.setting && this.setting.rootCa) {
        return this.setting.rootCa.setuped === true
      }
      return false
    }
  },
  data () {
    return {
      donateModal: false,
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
      info: {},
      newVersionDownloading: false,
      setting: undefined,
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
      update: { downloading: false, progress: 0, newVersion: false }
    }
  },
  async created () {
    await this.doCheckRootCa()
    await this.reloadConfig()
    this.$set(this, 'status', this.$status)
    this.switchBtns = this.createSwitchBtns()
    this.$set(this, 'update', this.$global.update)
    if (!this.update.autoChecked) {
      this.update.autoChecked = true
      this.doCheckUpdate(false)
    }
    this.$api.info.get().then(ret => {
      this.info = ret
    })
  },
  mounted () {
  },
  methods: {
    async modeChange (event) {
      const mode = this.config.app.mode
      if (mode === 'safe') {
        this.config.server.intercept.enabled = false
        this.config.server.dns.speedTest.enabled = true
        this.config.plugin.overwall.enabled = false
      } else if (mode === 'default') {
        this.config.server.intercept.enabled = true
        this.config.server.dns.speedTest.enabled = true
        this.config.plugin.overwall.enabled = false
      } else if (mode === 'ow') {
        console.log('event', event)
        if (!this.setting.overwall) {
          this.wantOW()
          return
        }
        this.config.server.intercept.enabled = true
        this.config.server.dns.speedTest.enabled = true
        this.config.plugin.overwall.enabled = true
      }
      this.$api.config.save(this.config).then(() => {
        this.$message.info('设置已保存')
      })
      if (this.status.server.enabled) {
        return this.$api.server.restart()
      }
    },
    wantOW () {
      this.$success({
        title: '彩蛋（增强模式）',
        content: (
          <div>
          我把它藏在了源码里，感兴趣的话可以找一找它（线索提示 // TODO）
          </div>
        )
      })
    },
    async doCheckRootCa () {
      const setting = await this.$api.setting.load()
      console.log('setting', setting)
      this.setting = setting
      if (this.setting.rootCa && (this.setting.rootCa.setuped || this.setting.rootCa.noTip)) {
        return
      }
      this.$confirm({
        title: '第一次使用，请先安装CA根证书',
        content: '本应用正常使用，必须安装和信任CA根证书',
        cancelText: '下次',
        okText: '去安装',
        onOk: () => {
          this.openSetupCa()
        },
        onCancel: () => {
          this.setting.rootCa = this.setting.rootCa || {}
          //  const rootCa = this.setting.rootCa
          // rootCa.noTip = true
          // this.$api.setting.save(this.setting)
        }
      })
    },
    openSetupCa () {
      this.setupCa.visible = true
    },
    async handleCaSetuped () {
      console.log('this.config.server.setting.rootCaFile.certPath', this.config.server.setting.rootCaFile.certPath)
      await this.$api.shell.setupCa({ certPath: this.config.server.setting.rootCaFile.certPath })
      this.setting.rootCa = this.setting.rootCa || {}
      const rootCa = this.setting.rootCa
      rootCa.setuped = true
      this.$set(this, 'setting', this.setting)
      this.$api.setting.save(this.setting)
    },
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
        if (this.config.plugin[key].statusOff) {
          return
        }
        btns[key] = this.createSwitchBtn(key, this.config.plugin[key].name, this.$api.plugin[key], status.plugin, this.config.plugin[key].tip)
      })
      return btns
    },
    createSwitchBtn (key, label, apiTarget, statusParent, tip) {
      return {
        loading: false,
        key,
        label,
        tip,
        status: () => {
          return statusParent[key].enabled
        },
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
      this.setting.visible = true
    },
    onConfigChanged (newConfig) {
      console.log('config changed', newConfig)
      this.reloadConfig().then(() => {
        if (this.status.server) {
          return this.$api.server.restart()
        }
      })
    },
    goDonate () {
      this.$message.info('感谢支持')
    },
    doCheckUpdate (fromUser = true) {
      this.$api.update.checkForUpdate(fromUser)
    },
    openExternal (url) {
      this.$api.ipc.openExternal(url)
    },
    onShutdownTipClose (e) {
      this.$confirm({
        title: '是否永久关闭该提示',
        okText: '我已知晓，不再提示',
        cancelText: '下次还显示',
        onOk: () => {
          this.$api.config.update({ app: { showShutdownTip: false } })
        }
      })
    }
  }
}
</script>
<style lang="scss">
.page_index {
  .mode-bar {
    margin: 30px;
    text-align: center;
  }

  .star {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding:10px;
    .donate {
      cursor: pointer;
    }

    .right {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
    }

    > * {
      margin-right: 10px;
    }

    a {
      height: 21px;

      img {
        height: 21px;
      }
    }
  }
}

.payQrcode {
  padding: 10px;
  display: flex;
  justify-content: space-evenly;
}

.big_button > button {
  width: 100px;
  height: 100px;
  border-radius: 100px;
}

.big_button > button i {
  size: 40px;
}

div.ant-form-item {
  margin-bottom: 10px;
}
</style>
