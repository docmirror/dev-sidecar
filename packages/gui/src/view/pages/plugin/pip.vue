<script>
import Plugin from '../../mixins/plugin'

export default {
  name: 'Pip',
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.pip',
      labelCol: { span: 4 },
      wrapperCol: { span: 20 },
      npmVariables: undefined,
      registry: false,
      trustedHostList: [],
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    ready () {
    },
    async applyBefore () {
      this.config.plugin.pip.setting.trustedHost = this.config.plugin.pip.setting.trustedHost.replaceAll(/[,，。+\s]+/g, ' ').trim()
    },
    async applyAfter () {
      await this.$api.plugin.pip.start()
      await this.$api.proxy.restart()
    },
    async onSwitchRegistry (event) {
      await this.setRegistry({ registry: event.target.value })
      this.$message.success('切换成功')
    },
    async setRegistry ({ registry }) {
      this.config.plugin.pip.setting.registry = registry
      const domain = registry.substring(registry.indexOf('//') + 2, registry.indexOf('/', 8))
      this.config.plugin.pip.setting.trustedHost = domain
      await this.apply()
    },
  },
}
</script>

<template>
  <ds-container>
    <template slot="header">
      PIP加速
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
        <!--        <a-form-item label="启用PIP加速" :label-col="labelCol" :wrapper-col="wrapperCol"> -->
        <!--          <a-checkbox v-model="config.plugin.pip.enabled"> -->
        <!--            随应用启动 -->
        <!--          </a-checkbox> -->
        <!--          <a-tag v-if="status.plugin.pip.enabled" color="green"> -->
        <!--            当前已启动 -->
        <!--          </a-tag> -->
        <!--          <a-tag v-else color="red"> -->
        <!--            当前未启动 -->
        <!--          </a-tag> -->
        <!--        </a-form-item> -->
        <a-form-item label="pip命令名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model="config.plugin.pip.setting.command" spellcheck="false" />
          <div class="form-help">
            如果你的<code>pip</code>命令改成了其他名字（如<code>pip3</code>），或想设置绿色版<code>pip</code>程序路径，可在此处修改
          </div>
        </a-form-item>
        <a-form-item label="仓库镜像" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-radio-group
            v-model="config.plugin.pip.setting.registry" default-value="https://pypi.org/simple/"
            button-style="solid" @change="onSwitchRegistry"
          >
            <a-radio-button value="https://pypi.org/simple/" title="https://pypi.org/simple/">
              原生
            </a-radio-button>
            <a-radio-button value="https://mirrors.aliyun.com/pypi/simple/" title="https://mirrors.aliyun.com/pypi/simple/">
              aliyun镜像
            </a-radio-button>
            <a-radio-button value="https://mirrors.bfsu.edu.cn/pypi/web/simple/" title="https://mirrors.bfsu.edu.cn/pypi/web/simple/">
              北京外国语大学镜像
            </a-radio-button>
            <a-radio-button value="https://mirror.nju.edu.cn/pypi/web/simple/" title="https://mirror.nju.edu.cn/pypi/web/simple/">
              南京大学镜像
            </a-radio-button>
            <a-radio-button value="https://pypi.tuna.tsinghua.edu.cn/simple/" title="https://pypi.tuna.tsinghua.edu.cn/simple/">
              清华大学镜像
            </a-radio-button>
            <a-radio-button value="https://mirror.baidu.com/pypi/simple/" title="https://mirror.baidu.com/pypi/simple/">
              百度镜像
            </a-radio-button>
            <a-radio-button value="https://pypi.mirrors.ustc.edu.cn/simple/" title="https://pypi.mirrors.ustc.edu.cn/simple/">
              中科大镜像
            </a-radio-button>
            <a-radio-button value="http://pypi.douban.com/simple/" title="http://pypi.douban.com/simple/">
              豆瓣镜像
            </a-radio-button>
            <a-radio-button value="http://mirrors.sohu.com/Python/" title="http://mirrors.sohu.com/Python/">
              搜狐镜像
            </a-radio-button>
            <a-radio-button value="https://mirrors.hust.edu.cn/pypi/web/simple/" title="https://mirrors.hust.edu.cn/pypi/web/simple/">
              华中科大镜像
            </a-radio-button>
            <a-radio-button value="http://pypi.sdutlinux.org/" title="http://pypi.sdutlinux.org/">
              山东理工大学镜像
            </a-radio-button>
          </a-radio-group>
          <div class="form-help">
            设置后立即生效，即使关闭 ds 也会继续保持
          </div>
        </a-form-item>
        <a-form-item label="信任仓库域名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model="config.plugin.pip.setting.trustedHost" spellcheck="false" />
          <div class="form-help">
            使用以上域名安装包时，不会进行SSL证书验证，多个域名用空格隔开<br>
            注意：切换仓库镜像同时会修改<code>pip.ini</code>中的<code>trusted-host</code>配置，即使关闭 ds 也会继续保持
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
