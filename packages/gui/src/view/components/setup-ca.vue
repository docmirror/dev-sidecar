<template>
  <a-drawer
    placement="right"
    :closable="false"
    :visible="visible"
    :after-visible-change="afterVisibleChange"
    @close="onClose"
    width="650px"
    height="100%"
    :slots="{ title: 'title' }"
    wrapClassName="json-wrapper"
  >
    <template slot="title">
      {{title}}
      <a-button type="primary" style="float:right" @click="doSetup()">点此去安装</a-button>
    </template>
    <img width="100%" src="/setup.png" />

  </a-drawer>
</template>

<script>
import api from '../api'
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
    }
  },
  created () {
  },
  methods: {
    afterVisibleChange (val) {
    },
    showDrawer () {
      this.$emit('update:visible', true)
    },
    onClose () {
      this.$emit('update:visible', false)
    },
    doSetup () {
      api.shell.setupCa()
    }
  }
}
</script>

<style>
</style>
