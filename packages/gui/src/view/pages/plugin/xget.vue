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
    }
  },

  methods: {
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

      <a-form-item :wrapper-col="{ offset: 4 }">
        <a-button type="primary" :loading="applyLoading" @click="apply()">
          保存并生效
        </a-button>
      </a-form-item>
    </a-form>
  </ds-container>
</template>
