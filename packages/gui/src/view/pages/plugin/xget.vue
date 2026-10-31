<script>
import { defineComponent } from 'vue'

import Plugin from '../../mixins/plugin'

export default defineComponent({
  name: 'Xget',
  mixins: [Plugin],

  data () {
    return {
      key: 'plugin.xget',
      labelCol: { span: 4 },
      wrapperCol: { span: 20 },
      cfAccessSecretInput: '',
      cfAccessSecretStored: false,
    }
  },

  methods: {
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
    async ready () {
      this.cfAccessSecretStored = await this.$api.plugin.xget.hasCfAccessSecret()
    },
    async saveCfAccessSecret () {
      const value = String(this.cfAccessSecretInput || '').trim()
      if (!value) {
        this.$message.warning('请先输入服务令牌')
        return
      }
      const ret = await this.$api.plugin.xget.setCfAccessSecret(value)
      this.cfAccessSecretInput = ''
      this.cfAccessSecretStored = true
      this.$message.success(`服务令牌已保存（${ret && ret.backend === 'keytar' ? '系统密钥库' : '本机加密文件'}）`)
    },
    async clearCfAccessSecret () {
      await this.$api.plugin.xget.clearCfAccessSecret()
      this.cfAccessSecretStored = false
      this.$message.success('已清除保存的服务令牌')
    },
    async applyBefore () {
      const setting = this.config.plugin.xget.setting
      setting.instanceUrl = String(setting.instanceUrl || '').trim()
      setting.cfAccessClientId = String(setting.cfAccessClientId || '').trim()
      // Secret 不进配置文件：这里填了就存进系统密钥库
      if (String(this.cfAccessSecretInput || '').trim()) {
        await this.saveCfAccessSecret()
      }
      if (setting.cfAccessClientId && !this.cfAccessSecretStored) {
        this.$message.warning('已填写 Client ID 但还没有保存 Client Secret，Cloudflare Access 会拒绝请求')
      }
    },
    async applyAfter () {
      // 规则合并发生在配置加载阶段，保存后需要重新加载配置并重启代理才会生效
      await this.$api.config.reload()
      await this.$api.proxy.restart()
      this.$message.success('Xget 规则已重新合并并生效')
    },
  },
})
</script>

<template>
  <ds-container>
    <template #header>
      Xget 加速
    </template>

    <a-form v-if="config" :label-col="labelCol" :wrapper-col="wrapperCol">
      <a-form-item label="启用">
        <a-switch v-model:checked="config.plugin.xget.enabled" />
        <div class="form-help">
          启用并填写实例地址后，Xget 的全平台加速规则会合并进配置；关闭后规则会被移除。
        </div>
      </a-form-item>

      <a-form-item label="Xget 实例地址">
        <a-input
          v-model:value="config.plugin.xget.setting.instanceUrl"
          placeholder="https://xget.example.com"
          allow-clear
        />
        <div class="form-help">
          填写你部署或使用的 Xget 实例地址，支持子路径与端口（如 https://xget.example.com/xget、http://192.168.1.2:8080）；优先级等同于本地用户配置，你自己的同名规则仍然优先。
        </div>
      </a-form-item>

      <a-form-item label="CF Access ID">
        <a-input
          v-model:value="config.plugin.xget.setting.cfAccessClientId"
          placeholder="可选，Cloudflare Access 服务令牌的 Client ID"
          allow-clear
        />
        <div class="form-help">
          仅当实例挂在 Cloudflare Access 后面时需要。保存 Client Secret 后，本插件的所有规则都会自动携带 cf-access-client-id 与 cf-access-client-secret 请求头。
        </div>
      </a-form-item>

      <a-form-item label="CF Access Secret">
        <a-space direction="vertical" style="width: 100%">
          <a-space wrap>
            <a-input-password
              v-model:value="cfAccessSecretInput"
              :placeholder="cfAccessSecretStored ? '已保存，输入新令牌可覆盖' : '可选，Cloudflare Access 的 Client Secret'"
              style="width: 340px"
              allow-clear
            />
            <a-button :disabled="!cfAccessSecretInput" @click="saveCfAccessSecret">
              保存密钥
            </a-button>
            <a-button v-if="cfAccessSecretStored" danger @click="clearCfAccessSecret">
              清除已保存
            </a-button>
          </a-space>
          <div class="form-help">
            密钥保存到系统密钥库（Windows 凭据管理器 / macOS 钥匙串 / Linux libsecret），不写入 config.json；系统密钥库不可用时退回本机加密文件。输入框只用于写入，不会回显已保存的值。
          </div>
        </a-space>
      </a-form-item>

      <a-collapse ghost class="cf-guide">
        <a-collapse-panel key="guide" header="实例挂在 Cloudflare Access 后面？点这里看配置步骤">
          <ol class="cf-guide-steps">
            <li>
              <b>创建服务令牌</b>：打开
              <a @click="openExternal('https://one.dash.cloudflare.com')">Cloudflare One</a>
              → Access controls → Service credentials → Service Tokens → Create Service Token，复制 Client ID 与 Client Secret（Secret 只显示一次）。
            </li>
            <li>
              <b>保护 Worker 入口</b>：Workers &amp; Pages → 你的 Worker → Access → Protect this Worker behind Access → 选 All traffic。
              这样 workers.dev、自定义域名和预览部署会一起受保护；只保护单个主机名时其余入口仍然公开，<b>建议同时限制预览部署的访问</b>。
            </li>
            <li>
              <b>放行令牌</b>：在 Zero Trust 里编辑该应用，停用所有 Allow 策略，新增 Action 为 Service Auth 的策略并勾选刚创建的令牌。
            </li>
            <li>
              <b>开启严格模式</b>：Access settings → Strict service token authentication。不开的话未授权请求会被 302 到登录页，客户端只拿到 HTML，很难定位问题。
            </li>
          </ol>
          <div class="form-help">
            填好仍不通：302 到 cloudflareaccess.com 通常是策略还是 Allow 或严格模式未开；403 且令牌正确，通常是策略没勾选这个令牌，或 Access 应用绑定的域名与实际访问的主机不一致。
          </div>
        </a-collapse-panel>
      </a-collapse>

      <a-form-item :wrapper-col="{ offset: 4 }">
        <a-button type="primary" :loading="applyLoading" @click="apply()">
          保存并生效
        </a-button>
      </a-form-item>
    </a-form>
  </ds-container>
</template>

<style scoped>
.cf-guide {
  margin: 0 0 8px 0;
}
.cf-guide-steps {
  margin: 0 0 8px 0;
  padding-left: 18px;
  line-height: 1.8;
}
.cf-guide-steps li {
  margin-bottom: 6px;
}
</style>
