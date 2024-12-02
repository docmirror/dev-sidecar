<script>
export default {
  name: 'TreeNode',
  props: {
    treeData: Array,
  },
  methods: {
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
  },
}
</script>

<template>
  <ul>
    <li v-for="node in treeData" :key="node.title">
      <span v-if="node.url && (node.url.startsWith('http://') || node.url.startsWith('https://'))">
        <a :title="node.tip || node.title" :class="node.class" :style="node.style" @click="openExternal(node.url)">{{ node.title }}</a>
      </span>
      <span v-else>
        <label :title="node.tip || node.title" :class="node.class" :style="node.style">{{ node.title }}</label>
      </span>
      <tree-node v-if="node.children && node.children.length > 0" :tree-data="node.children" class="child-node" />
    </li>
  </ul>
</template>
