<template>
  <a-drawer
    placement="right"
    :closable="false"
    :visible="visible"
    :after-visible-change="afterVisibleChange"
    @close="onClose"
    width="660px"
    height="100%"
    :slots="{ title: 'title' }"
    wrapClassName="json-wrapper"
  >
    <template slot="title">
      {{title}}
      <a-button type="primary" style="float:right" @click="doSetup()">点此去安装</a-button>
      <a-button style="float:right;margin-right:10px;" @click="openExternal('https://gitee.com/docmirror/dev-sidecar/blob/master/doc/caroot.md')">为什么要安装证书？</a-button>
    </template>
    <div>
      <b>本应用在非“安全模式”下必须安装和信任CA根证书</b>，该证书是应用启动时本地随机生成的<br/>

      <template v-if="this.systemPlatform === 'mac'">
        1、点击右上角“点此去安装按钮”，打开钥匙串，<b style="color:red">选择”系统“</b><br/>
        2、然后按如下图步骤将随机生成的根证书设置为始终信任<br/>
        3、可能需要重新启动应用和浏览器才能生效<br/>
        4、注意：如果出现无法导入提示时，先点一下钥匙串的左边切换到<b style="color:red">“系统”栏</b>，然后再重新安装证书即可<br/>
      </template>
      <template v-else-if="this.systemPlatform === 'linux'">
        1、点击右上角“点此去安装按钮”,将自动安装到系统证书库中<br/>
        2、<b color="red">火狐、chrome等浏览器不走系统证书</b>，需要手动安装(下图以chrome为例安装根证书)<br/>
      </template>
      <template v-else>
        1、点击右上角“点此去安装按钮”，打开证书<br/>
        2、然后按如下图步骤将根证书添加到<b style="color:red">信任的根证书颁发机构</b><br/>
      </template>
    </div>
    <img width="100%" :src="setupImage" />
  </a-drawer>
</template>

<script>
export default {
  name: 'setup-ca',
  components: {

  },
  props: {
    title: {
      type: String,
      default: '安装根证书'
    },
    visible: {
      type: Boolean
    }
  },
  data () {
    return {
      systemPlatform: ''
    }
  },
  async created () {
    const platform = await this.$api.info.getSystemPlatform()
    this.systemPlatform = platform
  },
  computed: {
    setupImage () {
      if (this.systemPlatform === 'mac') {
        return '/setup-mac.png'
      } else if (this.systemPlatform === 'linux') {
        return '/setup-linux.png'
      } else {
        return '/setup.png'
      }
    }
  },
  methods: {
    openExternal (url) {
      this.$api.ipc.openExternal(url)
    },
    afterVisibleChange (val) {
    },
    showDrawer () {
      this.$emit('update:visible', true)
    },
    onClose () {
      this.$emit('update:visible', false)
    },
    async doSetup () {
      this.$emit('setup')
      if (this.systemPlatform === 'linux') {
        this.$message.success('根证书已成功安装到系统证书库（注意：浏览器仍然需要手动安装）')
      }
    }
  }
}
</script>

<style>
</style>
