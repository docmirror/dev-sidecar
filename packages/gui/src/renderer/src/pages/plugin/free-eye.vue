<script>
import lodash from 'lodash'
import Plugin from '../../mixins/plugin'

export default {
  name: 'FreeEye',
  mixins: [Plugin],
  data () {
    return {
      key: 'plugin.free_eye',
      running: false,
      lastResult: null,
      summaryColumns: [
        { title: '测试', dataIndex: 'tag', key: 'tag' },
        { title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } },
        { title: '耗时', dataIndex: 'duration', key: 'duration', scopedSlots: { customRender: 'duration' } },
        { title: '输出', dataIndex: 'output', key: 'output', scopedSlots: { customRender: 'output' } },
      ],
      unwatchStatus: null,
    }
  },
  computed: {
    pluginStatus () {
      return lodash.get(this.$status, 'plugin.free_eye', {})
    },
    summaryData () {
      if (!this.lastResult || !Array.isArray(this.lastResult.summaries)) {
        return []
      }
      return this.lastResult.summaries.map((item, index) => ({
        key: `${item.tag || 'test'}-${index}`,
        ...item,
        status: item.skipped ? 'skipped' : 'completed',
      }))
    },
    logs () {
      if (!this.lastResult || !Array.isArray(this.lastResult.logs)) {
        return []
      }
      return this.lastResult.logs
    },
    rawLogsText () {
      if (!this.lastResult) {
        return ''
      }
      if (Array.isArray(this.lastResult.logs) && this.lastResult.logs.length > 0) {
        return this.lastResult.logs.map((entry) => {
          const timestamp = entry && entry.timestamp ? new Date(entry.timestamp) : null
          const formattedTime = timestamp && !Number.isNaN(timestamp.getTime())
            ? timestamp.toLocaleString()
            : ''
          const level = entry && entry.level ? `[${String(entry.level).toUpperCase()}]` : ''
          const message = entry && entry.message ? entry.message : ''
          return `${formattedTime ? `${formattedTime} ` : ''}${level} ${message}`.trim()
        }).join('\n')
      }
      return (this.lastResult.raw
        || this.lastResult.output
        || (this.lastResult.results ? JSON.stringify(this.lastResult.results, null, 2) : ''))
    },
  },
  created () {
    this.unwatchStatus = this.$watch(
      () => lodash.get(this.$status, 'plugin.free_eye.result'),
      () => this.refreshResult(),
      { deep: true },
    )
  },
  mounted () {
    this.refreshResult()
  },
  beforeDestroy () {
    if (this.unwatchStatus) {
      this.unwatchStatus()
    }
  },
  methods: {
    ready () {
      this.refreshResult()
    },
    refreshResult () {
      this.lastResult = lodash.cloneDeep(lodash.get(this.$status, 'plugin.free_eye.result', null))
    },
    formatTime (value) {
      if (!value) {
        return '-'
      }
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return value
      }
      return date.toLocaleString()
    },
    formatSeconds (value) {
      if (value == null || Number.isNaN(Number(value))) {
        return '-'
      }
      return `${Number(value).toFixed(3)}s`
    },
    async runTests () {
      if (this.running) {
        return
      }
      this.running = true
      try {
        const ret = await this.$api.plugin.free_eye.run()
        this.lastResult = ret
        this.$message.success('检测完成')
      } catch (err) {
        const message = err && err.message ? err.message : err
        this.$message.error(`检测失败: ${message}`)
      } finally {
        this.running = false
      }
    },
  },
}
</script>

<template>
  <ds-container>
    <template slot="header">
      网络检测 (FreeEye)
    </template>

    <div v-if="config">
      <a-alert
        class="mb16"
        type="info"
        show-icon
        message="运行一组网络连通性与审查检测用例，并将结果展示在此页面。"
      />

      <div class="action-bar">
        <a-button type="primary" icon="experiment" :loading="running" @click="runTests">
          运行检测
        </a-button>
        <span v-if="lastResult" class="last-run">最近完成：{{ formatTime(lastResult.finishedAt) }}</span>
      </div>

      <a-empty v-if="!lastResult" description="尚未运行检测" />

      <div v-else>
        <a-descriptions bordered size="small" class="mb16">
          <a-descriptions-item label="完成时间">
            {{ formatTime(lastResult.finishedAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="测试数量">
            {{ lastResult.totalTests || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="成功执行">
            {{ lastResult.completedTests || '-' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="lastResult.error" label="错误" :span="3">
            <a-tag color="red">
              {{ lastResult.error }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <a-table
          class="mb16"
          size="small"
          :columns="summaryColumns"
          :data-source="summaryData"
          :pagination="false"
          row-key="key"
        >
          <template slot="status" slot-scope="text, record">
            <a-tag v-if="record.skipped" color="orange">
              已跳过
            </a-tag>
            <a-tag v-else color="green">
              已完成
            </a-tag>
          </template>
          <template slot="duration" slot-scope="text, record">
            <span v-if="!record.skipped && record.duration != null">{{ formatSeconds(record.duration) }}</span>
            <span v-else>-</span>
          </template>
          <template slot="output" slot-scope="text, record">
            <pre class="summary-output">{{ record.output }}</pre>
          </template>
        </a-table>

        <a-collapse class="mb16">
          <a-collapse-panel key="raw-logs" header="原始日志">
            <a-textarea
              class="raw-log-textarea"
              :value="rawLogsText"
              :autosize="{ minRows: 10 }"
              readonly
            />
          </a-collapse-panel>
          <a-collapse-panel key="formatted-results" header="格式化结果">
            <pre class="raw-json">{{ JSON.stringify(lastResult.results, null, 2) }}</pre>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>
  </ds-container>
</template>

<style scoped lang="scss">
.mb16 {
  margin-bottom: 16px;
}
.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.last-run {
  color: rgba(255, 255, 255, 0.65);
}
.summary-output {
  margin: 0;
  white-space: pre-wrap;
}
.raw-json {
  margin: 0;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}
.raw-log-textarea {
  white-space: pre-wrap;
}
</style>
