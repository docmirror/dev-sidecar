<template>
  <ds-container>
    <template slot="header">
      梯子
      <span>
      </span>
    </template>

    <div v-if="config">
      <a-form layout="horizontal">
        <a-form-item label="梯子" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.overwall.enabled">
            启用
          </a-checkbox>
          <div>这是什么功能？你懂的！偷偷的用，别声张。（可以分享给信得过的朋友）</div>
          <div>还有，不要看视频，流量挺小的</div>
        </a-form-item>
        <a-form-item label="PAC" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-checkbox v-model="config.plugin.overwall.pac.enabled">
            启用PAC
          </a-checkbox>
        </a-form-item>
        <a-form-item label="自定义域名" :label-col="labelCol" :wrapper-col="wrapperCol">
          <div>
            <a-row :gutter="10" style="">
              <a-col :span="14">
                <span>PAC没有拦截到的域名，可以在此处定义</span>
              </a-col>
              <a-col :span="3">
                <a-button  type="primary" icon="plus" @click="addTarget()" />
              </a-col>
            </a-row>
            <a-row :gutter="10"  v-for="(item,index) of targets" :key = 'index'>
              <a-col :span="14">
                <a-input  v-model="item.key"></a-input>
              </a-col>
              <a-col :span="3">
                <a-button  type="danger" icon="minus" @click="deleteTarget(item,index)" />
              </a-col>
            </a-row>

          </div>
        </a-form-item>
      </a-form>
    </div>
    <template slot="footer">
      <div class="footer-bar">
        <a-button class="md-mr-10" icon="sync"   @click="resetDefault()">恢复默认</a-button>
        <a-button :loading="applyLoading" icon="check" type="primary" @click="apply()">应用</a-button>
      </div>
    </template>
  </ds-container>

</template>

<script>
import Plugin from '../../mixins/plugin'

export default {
  name: 'Overwall',
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.overwall',
      targets: undefined
    }
  },
  created () {
    console.log('status:', this.status)
  },
  mounted () {
  },
  methods: {
    async applyAfter () {
      if (this.status.server.enabled) {
        return this.$api.server.restart()
      }
    },
    ready () {
      this.targets = []
      const targetsMap = this.config.plugin.overwall.targets
      for (const key in targetsMap) {
        const value = targetsMap[key]
        this.targets.push({
          key, value
        })
      }
    },
    deleteTarget (item, index) {
      this.targets.splice(index, 1)
    },
    addTarget () {
      this.targets.unshift({ key: '', value: true })
    },
    async applyBefore () {
      const map = {}
      for (const item of this.targets) {
        if (item.key) {
          map[item.key] = item.value
        }
      }
      this.config.plugin.overwall.targets = map
    }
  }
}
</script>
<style lang="sass">
</style>
