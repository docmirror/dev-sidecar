<script>
import { defineComponent } from 'vue'
import { LinkOutlined, ReloadOutlined } from '@ant-design/icons-vue'

const STATUS_API = 'https://www.githubstatus.com/api/v2/summary.json'
const INCIDENTS_API = 'https://www.githubstatus.com/api/v2/incidents.json'

// GitHub Status 状态码 -> 颜色/文案/圆点
const STATUS_META = {
  operational: { color: 'success', text: '运行正常', dot: 'green' },
  degraded_performance: { color: 'warning', text: '性能下降', dot: 'orange' },
  partial_outage: { color: 'warning', text: '部分中断', dot: 'orange' },
  major_outage: { color: 'error', text: '重大故障', dot: 'red' },
  under_maintenance: { color: 'processing', text: '维护中', dot: 'blue' },
  none: { color: 'success', text: '全部正常', dot: 'green' },
  minor: { color: 'warning', text: '轻微', dot: 'orange' },
  major: { color: 'error', text: '严重', dot: 'red' },
  critical: { color: 'error', text: '严重', dot: 'red' },
}

const INCIDENT_STATUS_META = {
  investigating: { color: 'error', text: '调查中' },
  identified: { color: 'warning', text: '已定位' },
  monitoring: { color: 'processing', text: '监控中' },
  resolved: { color: 'success', text: '已恢复' },
  postmortem: { color: 'default', text: '复盘' },
}

function getStatusMeta (status) {
  return STATUS_META[status] || { color: 'default', text: status || '未知', dot: 'gray' }
}

function getIncidentStatusMeta (status) {
  return INCIDENT_STATUS_META[status] || { color: 'default', text: status || '未知', dot: 'gray' }
}

export default defineComponent({
  name: 'GithubStatus',
  components: { ReloadOutlined, LinkOutlined },

  data () {
    return {
      loading: false,
      error: null,
      lastUpdated: null,
      summary: null,
      incidents: [],
      historyColumns: [
        { title: '事件', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
        { title: '影响', dataIndex: 'impact', key: 'impact', width: 100 },
        { title: '开始时间', dataIndex: 'started_at', key: 'started_at', width: 180 },
      ],
      tableScrollY: 300,
    }
  },

  computed: {
    overallMeta () {
      return this.summary ? getStatusMeta(this.summary.status?.indicator) : null
    },
    components () {
      if (!this.summary)
        return []
      return (this.summary.components || [])
        .filter(c => c.name && !c.name.toLowerCase().includes('visit www.githubstatus.com'))
        .sort((a, b) => (a.position || 0) - (b.position || 0))
    },
    activeIncidents () {
      return (this.incidents || []).filter(i => i.status !== 'resolved' && i.status !== 'postmortem')
    },
    recentIncidents () {
      return (this.incidents || []).slice(0, 20)
    },
  },

  mounted () {
    this.refresh()
    window.addEventListener('resize', this.calcHistoryTableScrollY)
  },

  beforeUnmount () {
    window.removeEventListener('resize', this.calcHistoryTableScrollY)
  },

  methods: {
    getStatusMeta,
    getIncidentStatusMeta,
    async refresh () {
      if (this.loading)
        return
      this.loading = true
      try {
        const [summary, incidents] = await Promise.all([
          fetch(STATUS_API, { cache: 'no-cache' }).then(r => r.json()),
          fetch(INCIDENTS_API, { cache: 'no-cache' }).then(r => r.json()),
        ])
        this.summary = summary
        this.incidents = incidents.incidents || []
        this.lastUpdated = new Date(summary.page?.updated_at || Date.now())
        this.error = null
      } catch (e) {
        console.error('GitHub Status 加载失败:', e)
        this.error = e.message || '加载失败'
      } finally {
        this.loading = false
      }
    },
    formatTime (iso) {
      if (!iso)
        return '-'
      const d = new Date(iso)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    openExternal (url) {
      this.$api.ipc.openExternal(url)
    },
    onTabChange (key) {
      if (key === 'history') {
        this.$nextTick(() => this.calcHistoryTableScrollY())
      }
    },
    calcHistoryTableScrollY () {
      const el = this.$refs.historyPane
      if (!el)
        return
      // 预留表头 + 分页区域高度，表体在内部滚动
      this.tableScrollY = Math.max(100, el.clientHeight - 96)
    },
  },
})
</script>

<template>
  <ds-container class="page_github_status">
    <template #header>
      GitHub 状态监控
    </template>
    <template #header-right>
      <a-button :loading="loading" size="small" @click="refresh()">
        <template #icon>
          <ReloadOutlined />
        </template>
        刷新
      </a-button>
    </template>

    <a-alert
      v-if="error"
      class="mb16"
      type="error"
      show-icon
      :message="`加载 GitHub 状态失败：${error}`"
    />

    <!-- 整体状态 -->
    <a-row :gutter="8" class="mb16">
      <a-col :span="8">
        <div class="status-stat" :class="overallMeta ? `stat-${overallMeta.dot}` : ''">
          <div class="status-stat-dot" />
          <div>
            <div class="status-stat-value">
              {{ overallMeta ? overallMeta.text : '加载中…' }}
            </div>
            <div class="status-stat-label">
              整体状态
            </div>
          </div>
        </div>
      </a-col>
      <a-col :span="8">
        <div class="status-stat stat-blue">
          <div class="status-stat-dot" />
          <div>
            <div class="status-stat-value">
              {{ components.length }}
            </div>
            <div class="status-stat-label">
              服务组件
            </div>
          </div>
        </div>
      </a-col>
      <a-col :span="8">
        <div class="status-stat" :class="activeIncidents.length ? 'stat-red' : 'stat-green'">
          <div class="status-stat-dot" />
          <div>
            <div class="status-stat-value">
              {{ activeIncidents.length }}
            </div>
            <div class="status-stat-label">
              进行中事件
            </div>
          </div>
        </div>
      </a-col>
    </a-row>

    <div v-if="lastUpdated" class="updated-time mb16">
      数据更新于：{{ formatTime(lastUpdated.toISOString()) }}（进入页面或点击右上角“刷新”时更新）
    </div>

    <a-tabs class="page-tabs" size="small" @change="onTabChange">
      <!-- 组件状态 -->
      <a-tab-pane key="components" tab="服务组件">
        <a-row :gutter="[8, 8]">
          <a-col v-for="comp in components" :key="comp.id" :xs="24" :sm="12" :md="8" :lg="6">
            <a-card size="small" class="component-card">
              <div class="component-header">
                <span class="component-name" :title="comp.name">{{ comp.name }}</span>
                <span class="component-dot" :class="getStatusMeta(comp.status).dot" />
              </div>
              <div class="component-status">
                <a-tag :color="getStatusMeta(comp.status).color">
                  {{ getStatusMeta(comp.status).text }}
                </a-tag>
              </div>
              <div v-if="comp.description" class="component-desc">
                {{ comp.description }}
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- 进行中事件 -->
      <a-tab-pane key="active" :tab="`进行中事件 (${activeIncidents.length})`">
        <a-empty v-if="!activeIncidents.length" description="当前无进行中的事件，一切正常" />
        <a-timeline v-else>
          <a-timeline-item
            v-for="inc in activeIncidents"
            :key="inc.id"
            :color="getIncidentStatusMeta(inc.status).dot"
          >
            <div class="incident-title">
              <a-tag :color="getIncidentStatusMeta(inc.status).color">
                {{ getIncidentStatusMeta(inc.status).text }}
              </a-tag>
              <a-tag :color="getStatusMeta(inc.impact).color">
                {{ getStatusMeta(inc.impact).text }}
              </a-tag>
              <span>{{ inc.name }}</span>
            </div>
            <div class="incident-time">
              {{ formatTime(inc.started_at || inc.created_at) }}
            </div>
            <div v-for="update in (inc.incident_updates || []).slice(0, 3)" :key="update.id" class="incident-update">
              <a-tag size="small" :color="getIncidentStatusMeta(update.status).color">
                {{ getIncidentStatusMeta(update.status).text }}
              </a-tag>
              <span class="incident-body">{{ update.body }}</span>
            </div>
          </a-timeline-item>
        </a-timeline>
      </a-tab-pane>

      <!-- 历史事件 -->
      <a-tab-pane key="history" :tab="`历史事件 (${recentIncidents.length})`">
        <div ref="historyPane" class="history-pane">
          <a-table
            class="history-table"
            size="small"
            :columns="historyColumns"
            :data-source="recentIncidents"
            :pagination="{ pageSize: 10, size: 'small' }"
            :scroll="{ y: tableScrollY }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="getIncidentStatusMeta(record.status).color">
                  {{ getIncidentStatusMeta(record.status).text }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'impact'">
                <a-tag :color="getStatusMeta(record.impact).color">
                  {{ getStatusMeta(record.impact).text }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'name'">
                <a class="incident-link" @click="openExternal(record.shortlink)">{{ record.name }}</a>
              </template>
              <template v-else-if="column.key === 'started_at'">
                {{ formatTime(record.started_at || record.created_at) }}
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <template #footer>
      <div class="footer-link">
        数据来源：
        <a @click="openExternal('https://www.githubstatus.com')">GitHub Status <LinkOutlined /></a>
      </div>
    </template>
  </ds-container>
</template>

<style scoped>
.mb16 {
  margin-bottom: 16px;
}
.page_github_status :deep(.container-body) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.page-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.page-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}
.page-tabs :deep(.ant-tabs-content) {
  height: 100%;
}
.page-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.history-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.history-pane :deep(.ant-table-wrapper),
.history-pane :deep(.ant-spin-nested-loading),
.history-pane :deep(.ant-spin-container) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.history-pane :deep(.ant-spin-container > .ant-pagination) {
  margin-top: 12px;
  flex-shrink: 0;
}
.updated-time {
  color: #888;
  font-size: 12px;
}
.status-stat {
  display: flex;
  align-items: center;
  padding: 14px 12px;
  background: rgba(128, 128, 128, 0.08);
  border-radius: 6px;
  gap: 12px;
}
.status-stat-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8c8c8c;
  flex-shrink: 0;
}
.status-stat-value {
  font-size: 18px;
  font-weight: 600;
}
.status-stat-label {
  margin-top: 2px;
  color: #888;
  font-size: 12px;
}
.stat-green .status-stat-dot {
  background: #52c41a;
}
.stat-orange .status-stat-dot {
  background: #faad14;
}
.stat-red .status-stat-dot {
  background: #ff4d4f;
}
.stat-blue .status-stat-dot {
  background: #1890ff;
}

.component-card {
  height: 100%;
}
.component-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.component-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.component-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.component-dot.green {
  background: #52c41a;
}
.component-dot.orange {
  background: #faad14;
}
.component-dot.red {
  background: #ff4d4f;
}
.component-dot.blue {
  background: #1890ff;
}
.component-dot.gray {
  background: #8c8c8c;
}
.component-status {
  margin-top: 8px;
}
.component-desc {
  margin-top: 8px;
  color: #888;
  font-size: 12px;
  line-height: 1.5;
}

.incident-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-weight: 600;
}
.incident-time {
  margin-top: 4px;
  color: #888;
  font-size: 12px;
}
.incident-update {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
}
.incident-body {
  color: #555;
}

.history-table :deep(.ant-table) {
  table-layout: fixed;
  width: 100%;
}
.incident-link {
  cursor: pointer;
}
.footer-link {
  color: #888;
  font-size: 12px;
}
</style>
