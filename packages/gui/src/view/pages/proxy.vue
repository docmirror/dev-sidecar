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
        <div class="form-help">
          <a @click="openExternal('https://github.com/docmirror/dev-sidecar/blob/master/doc/recover.md')">卸载与恢复网络说明</a>
        </div>
      </a-form-item>
      <a-form-item label="代理HTTP请求" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.proxy.proxyHttp" >
          是否代理HTTP请求
        </a-checkbox>
        <div class="form-help">
          勾选时，同时代理<code>HTTP</code>和<code>HTTPS</code>请求；不勾选时，只代理<code>HTTPS</code>请求<br/>
          提示：仅为了加速访问<code>Github网站</code>的用户，建议不勾选。
        </div>
      </a-form-item>

      <!-- 以下两个功能仅windows支持，mac和linux暂不支持 -->
      <a-form-item v-if="isWindows()" label="设置环境变量" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.proxy.setEnv" >
          是否同时修改<code>HTTPS_PROXY</code>环境变量（不好用，不建议勾选）
        </a-checkbox>
        <div class="form-help">
          当发现某些应用并没有走加速通道或加速报错时，可尝试勾选此选项，并重新开启系统代理开关<br/>
          注意：当前已打开的命令行并不会实时生效，需要重新打开一个新的命令行窗口
        </div>
      </a-form-item>
      <a-form-item v-if="isWindows()" label="设置loopback" :label-col="labelCol" :wrapper-col="wrapperCol">
       <a-button @click="loopbackVisible=true">去设置</a-button>
        <div class="form-help">解决<code>OneNote</code>、<code>MicrosoftStore</code>、<code>Outlook</code>等<code>UWP应用</code>开启代理后无法访问网络的问题</div>
      </a-form-item>

      <hr/>
      <a-form-item label="排除国内域名" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.proxy.excludeDomesticDomainAllowList" >
          是否排除国内域名白名单
        </a-checkbox>
      </a-form-item>
      <a-form-item label="自动更新国内域名" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-checkbox v-model="config.proxy.autoUpdateDomesticDomainAllowList" >
          是否自动更新国内域名白名单
        </a-checkbox>
        <div class="form-help">
          开启自动更新并启动系统代理时，将会异步从下面的远程地址下载国内域名白名单文件到本地。<br/>
          注：只要下载成功后，即使关闭自动更新功能，也会优先读取最近下载的文件！
        </div>
      </a-form-item>
      <a-form-item label="远程国内域名地址" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-input v-model="config.proxy.remoteDomesticDomainAllowListFileUrl" :title="config.proxy.remoteDomesticDomainAllowListFileUrl"></a-input>
        <div class="form-help">
          远程国内域名白名单文件内容可以是<code>base64</code>编码格式，也可以是未经过编码的
        </div>
      </a-form-item>
      <hr/>
      <a-form-item label="自定义排除域名" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-row :gutter="10">
          <a-col :span="22">
            <span>访问的域名或IP符合下列配置时，将跳过系统代理</span>
          </a-col>
          <a-col :span="2">
            <a-button type="primary" icon="plus" @click="addExcludeIp()"/>
          </a-col>
        </a-row>
        <a-row :gutter="10" v-for="(item,index) of excludeIpList" :key='index'>
          <a-col :span="22">
            <a-input :disabled="item.value === false" v-model="item.key"></a-input>
          </a-col>
          <a-col :span="2">
            <a-button type="danger" icon="minus" @click="delExcludeIp(item,index)"/>
          </a-col>
        </a-row>
      </a-form-item>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button :loading="resetDefaultLoading" class="md-mr-10" icon="sync" @click="resetDefault()">恢复默认</a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">应用</a-button>
      </div>
    </template>

    <a-drawer
      placement="right"
      :closable="false"
      :visible.sync="loopbackVisible"
      width="660px"
      height="100%"
      @close="loopbackVisible=false"
      :slots="{ title: 'title' }"
      wrapClassName="json-wrapper"
    >
      <template slot="title">
        设置Loopback  <a-button style="float:right;margin-right:10px;" @click="openEnableLoopback()">打开EnableLoopback</a-button>
      </template>
      <div>
        <div>1、此设置用于解决OneNote、MicrosoftStore、Outlook等UWP应用无法访问网络的问题。</div>
        <div>2、点击右上方按钮，打开EnableLoopback，然后按下图所示操作即可</div>
        <div>3、注意：此操作需要<b style="color:red">DevSidecar以管理员身份启动</b>，才能打开下面的EnableLoopback设置界面</div>
        <img style="margin-top:20px;border:1px solid #eee" width="80%" src="loopback.png"/>
      </div>

    </a-drawer>
  </ds-container>

</template>

<script>
import Plugin from '../mixins/plugin'
export default {
  name: 'Proxy',
  mixins: [Plugin],
  data () {
    return {
      key: 'proxy',
      loopbackVisible: false,
      excludeIpList: []
    }
  },
  async created () {
  },
  mounted () {
  },
  methods: {
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
    ready () {
      this.initExcludeIpList()
    },
    async applyBefore () {
      this.submitExcludeIpList()
    },
    async applyAfter () {
      await this.$api.proxy.restart()
    },
    async openEnableLoopback () {
      try {
        await this.$api.proxy.setEnableLoopback()
      } catch (e) {
        if (e.message.indexOf('EACCES') !== -1) {
          this.$message.error('请将DevSidecar关闭后，以管理员身份重新打开，再尝试此操作')
          return
        }
        this.$message.error('打开失败：' + e.message)
      }
    },
    getProxyConfig () {
      return this.config.proxy
    },
    initExcludeIpList () {
      this.excludeIpList = []
      for (const key in this.config.proxy.excludeIpList) {
        const value = this.config.proxy.excludeIpList[key]
        this.excludeIpList.push({
          key, value
        })
      }
    },
    addExcludeIp () {
      this.excludeIpList.unshift({ key: '', value: true })
    },
    delExcludeIp (item, index) {
      this.excludeIpList.splice(index, 1)
    },
    submitExcludeIpList () {
      const excludeIpList = {}
      for (const item of this.excludeIpList) {
        if (item.key) {
          excludeIpList[item.key] = item.value
        }
      }
      this.config.proxy.excludeIpList = excludeIpList
    }
  }
}
</script>
<style lang="sass">
</style>
