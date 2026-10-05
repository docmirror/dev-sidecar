<script>
import { defineComponent } from 'vue';

import { ProfileOutlined } from '@ant-design/icons-vue'
import Plugin from '../mixins/plugin'
import TreeNode from '../components/tree-node'

export default defineComponent({
  name: 'Help',

  components: {
    TreeNode,
    ProfileOutlined,
  },

  mixins: [Plugin],

  data () {
    return {
      key: 'help',
      // 帮助中心内容来自远程配置的 help 段（config.help.dataList）：
      // 页面已打开时，远程配置更新后必须自己重新读取，否则会一直显示旧内容。
      autoReloadConfigOnChange: true,
    }
  },

  methods: {
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
  },
});
</script>

<template>
  <ds-container>
    <template #header>
      帮助中心
    </template>
    <template #header-right>
      <a-button class="mr10" @click="openExternal('https://github.com/docmirror/dev-sidecar/issues/new/choose')">反馈问题</a-button>
      <a-button class="mr10" @click="openLog()"><ProfileOutlined />查看日志</a-button>
    </template>

    <div v-if="config && config.help" class="help-list">
      <TreeNode :tree-data="config.help.dataList" />
    </div>
  </ds-container>
</template>
