<script>
import { defineComponent } from 'vue';
import { PushpinFilled, PushpinOutlined } from '@ant-design/icons-vue'

export default defineComponent({
  name: 'Traffic',

  components: {
    PushpinFilled,
    PushpinOutlined,
  },

  data () {
    return {
      traffic: {
        processStats: [],
        domainStats: [],
        total: {
          requests: 0,
          errors: 0,
          errorRate: 0,
          bytesUp: 0,
          bytesDown: 0,
        },
      },
      rawProcessStats: [],
      rawDomainStats: [],
      domainSearch: '',
      processSort: { key: 'speedDown', order: 'desc' },
      domainSort: { key: 'errors', order: 'desc' },
      pinnedProcess: null,
      pinnedHost: null,
      processColumns: [
        { title: '', dataIndex: 'pin', key: 'pin', width: '5%' },
        { title: '进程', dataIndex: 'processName', key: 'processName', width: '16%', sortable: true, ellipsis: true },
        { title: '连接数', dataIndex: 'connections', key: 'connections', width: '9%', sortable: true },
        { title: '请求数', dataIndex: 'requests', key: 'requests', width: '9%', sortable: true },
        { title: '错误数', dataIndex: 'errors', key: 'errors', width: '9%', sortable: true },
        { title: '上行速度', dataIndex: 'speedUp', key: 'speedUp', width: '12%', sortable: true },
        { title: '下行速度', dataIndex: 'speedDown', key: 'speedDown', width: '12%', sortable: true },
        { title: '累计上行', dataIndex: 'bytesUp', key: 'bytesUp', width: '12%', sortable: true },
        { title: '累计下行', dataIndex: 'bytesDown', key: 'bytesDown', width: '16%', sortable: true },
      ],
      domainColumns: [
        { title: '', dataIndex: 'pin', key: 'pin', width: '6%' },
        { title: '域名', dataIndex: 'host', key: 'host', width: '34%', sortable: true, ellipsis: true },
        { title: '请求数', dataIndex: 'requests', key: 'requests', width: '20%', sortable: true },
        { title: '错误数', dataIndex: 'errors', key: 'errors', width: '20%', sortable: true },
        { title: '错误率', dataIndex: 'errorRate', key: 'errorRate', width: '20%', sortable: true },
      ],
    }
  },

  computed: {
    filteredDomainStats () {
      const keyword = (this.domainSearch || '').trim().toLowerCase()
      if (!keyword) {
        return this.traffic.domainStats
      }
      return this.traffic.domainStats.filter((item) => item.host && item.host.toLowerCase().includes(keyword))
    },
  },

  mounted () {
    this.$api.ipc.on('traffic', this.onTraffic)
  },

  beforeUnmount () {
    this.$api.ipc.removeAllListeners('traffic')
  },

  methods: {
    onTraffic (event, message) {
      if (message && message.key === 'stats' && message.value) {
        this.traffic.total = message.value.total || this.traffic.total
        this.rawProcessStats = message.value.processStats || []
        this.rawDomainStats = message.value.domainStats || []
        this.applySortAndPin()
      }
    },
    applySortAndPin () {
      const processStats = [...this.rawProcessStats]
      if (this.processSort.key) {
        processStats.sort((a, b) => this.compare(a, b, this.processSort))
      }
      if (this.pinnedProcess) {
        const index = processStats.findIndex((item) => item.processName === this.pinnedProcess)
        if (index > 0) {
          const [pinned] = processStats.splice(index, 1)
          processStats.unshift(pinned)
        } else if (index < 0) {
          this.pinnedProcess = null
        }
      }
      this.traffic.processStats = processStats

      const domainStats = [...this.rawDomainStats]
      if (this.domainSort.key) {
        domainStats.sort((a, b) => this.compare(a, b, this.domainSort))
      }
      if (this.pinnedHost) {
        const index = domainStats.findIndex((item) => item.host === this.pinnedHost)
        if (index > 0) {
          const [pinned] = domainStats.splice(index, 1)
          domainStats.unshift(pinned)
        } else if (index < 0) {
          this.pinnedHost = null
        }
      }
      this.traffic.domainStats = domainStats
    },
    compare (a, b, sort) {
      const av = a[sort.key]
      const bv = b[sort.key]
      let result
      if (typeof av === 'string' && typeof bv === 'string') {
        result = av.localeCompare(bv)
      } else {
        const an = Number(av) || 0
        const bn = Number(bv) || 0
        result = an - bn
      }
      return sort.order === 'asc' ? result : -result
    },
    toggleProcessSort (key) {
      if (this.processSort.key === key) {
        this.processSort.order = this.processSort.order === 'asc' ? 'desc' : 'asc'
      } else {
        this.processSort.key = key
        this.processSort.order = key === 'processName' ? 'asc' : 'desc'
      }
      this.applySortAndPin()
    },
    toggleDomainSort (key) {
      if (this.domainSort.key === key) {
        this.domainSort.order = this.domainSort.order === 'asc' ? 'desc' : 'asc'
      } else {
        this.domainSort.key = key
        this.domainSort.order = key === 'host' ? 'asc' : 'desc'
      }
      this.applySortAndPin()
    },
    togglePinProcess (record) {
      this.pinnedProcess = this.pinnedProcess === record.processName ? null : record.processName
      this.applySortAndPin()
    },
    togglePinDomain (record) {
      this.pinnedHost = this.pinnedHost === record.host ? null : record.host
      this.applySortAndPin()
    },
    formatBytes (value) {
      if (value == null || Number.isNaN(Number(value))) {
        return '-'
      }
      const bytes = Number(value)
      if (bytes < 1024) {
        return `${bytes} B`
      }
      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
      }
      if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`
      }
      return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
    },
    formatSpeed (value) {
      return `${this.formatBytes(value)}/s`
    },
    formatRate (value) {
      if (value == null) {
        return '-'
      }
      return `${(Number(value) * 100).toFixed(2)}%`
    },
  },
});
</script>

<template>
  <ds-container>
    <template #header>
      日志与流量
    </template>
    <template #header-right>
      <a-tag color="blue">每 1 秒刷新</a-tag>
    </template>

    <a-row :gutter="8" class="mb16">
      <a-col :span="4">
        <div class="traffic-stat">
          <div class="traffic-stat-value">{{ traffic.total.requests || 0 }}</div>
          <div class="traffic-stat-label">总请求数</div>
        </div>
      </a-col>
      <a-col :span="4">
        <div class="traffic-stat">
          <div class="traffic-stat-value">{{ traffic.total.errors || 0 }}</div>
          <div class="traffic-stat-label">错误数</div>
        </div>
      </a-col>
      <a-col :span="4">
        <div class="traffic-stat">
          <div class="traffic-stat-value">{{ formatRate(traffic.total.errorRate) }}</div>
          <div class="traffic-stat-label">错误率</div>
        </div>
      </a-col>
      <a-col :span="6">
        <div class="traffic-stat">
          <div class="traffic-stat-value">{{ formatBytes(traffic.total.bytesUp) }}</div>
          <div class="traffic-stat-label">累计上行</div>
        </div>
      </a-col>
      <a-col :span="6">
        <div class="traffic-stat">
          <div class="traffic-stat-value">{{ formatBytes(traffic.total.bytesDown) }}</div>
          <div class="traffic-stat-label">累计下行</div>
        </div>
      </a-col>
    </a-row>

    <a-tabs size="small">
      <a-tab-pane key="process" tab="进程流量">
        <a-table
          class="traffic-table"
          size="small"
          :columns="processColumns"
          :data-source="traffic.processStats"
          :pagination="false"
          row-key="processName"
        >
          <template #headerCell="{ column }">
            <span
              v-if="column.sortable"
              class="sortable-header"
              @click="toggleProcessSort(column.key)"
            >
              {{ column.title }}
              <span class="sort-indicator">
                {{ processSort.key === column.key ? (processSort.order === 'asc' ? ' ↑' : ' ↓') : ' ↕' }}
              </span>
            </span>
            <span v-else>{{ column.title }}</span>
          </template>

          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'pin'">
              <a-button
                class="pin-btn"
                size="small"
                type="text"
                :title="pinnedProcess === record.processName ? '取消置顶' : '置顶'"
                @click.stop="togglePinProcess(record)"
              >
                <PushpinFilled v-if="pinnedProcess === record.processName" class="pin-icon pin-icon-active" />
                <PushpinOutlined v-else class="pin-icon" />
              </a-button>
            </template>
            <template v-else-if="column.key === 'processName'">
              <span class="cell-main">
                <a-tag v-if="pinnedProcess === record.processName" color="gold">已置顶</a-tag>
                <a-tag color="green">{{ record.processName }}</a-tag>
              </span>
            </template>
            <template v-else-if="column.key === 'errors'">
              <a-tag v-if="record.errors > 0" color="red">{{ record.errors }}</a-tag>
              <span v-else>0</span>
            </template>
            <template v-else-if="column.key === 'speedUp'">
              {{ formatSpeed(record.speedUp) }}
            </template>
            <template v-else-if="column.key === 'speedDown'">
              {{ formatSpeed(record.speedDown) }}
            </template>
            <template v-else-if="column.key === 'bytesUp'">
              {{ formatBytes(record.bytesUp) }}
            </template>
            <template v-else-if="column.key === 'bytesDown'">
              {{ formatBytes(record.bytesDown) }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="domain" tab="域名错误统计">
        <div class="domain-search">
          <a-input-search
            v-model:value="domainSearch"
            placeholder="搜索域名，例如 github.com"
            allow-clear
            style="max-width: 320px"
          />
        </div>
        <a-table
          class="traffic-table"
          size="small"
          :columns="domainColumns"
          :data-source="filteredDomainStats"
          :pagination="false"
          row-key="host"
        >
          <template #headerCell="{ column }">
            <span
              v-if="column.sortable"
              class="sortable-header"
              @click="toggleDomainSort(column.key)"
            >
              {{ column.title }}
              <span class="sort-indicator">
                {{ domainSort.key === column.key ? (domainSort.order === 'asc' ? ' ↑' : ' ↓') : ' ↕' }}
              </span>
            </span>
            <span v-else>{{ column.title }}</span>
          </template>

          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'pin'">
              <a-button
                class="pin-btn"
                size="small"
                type="text"
                :title="pinnedHost === record.host ? '取消置顶' : '置顶'"
                @click.stop="togglePinDomain(record)"
              >
                <PushpinFilled v-if="pinnedHost === record.host" class="pin-icon pin-icon-active" />
                <PushpinOutlined v-else class="pin-icon" />
              </a-button>
            </template>
            <template v-else-if="column.key === 'host'">
              <span class="cell-main">
                <a-tag v-if="pinnedHost === record.host" color="gold">已置顶</a-tag>
                <span>{{ record.host }}</span>
              </span>
            </template>
            <template v-else-if="column.key === 'errors'">
              <a-tag v-if="record.errors > 0" color="red">{{ record.errors }}</a-tag>
              <span v-else>0</span>
            </template>
            <template v-else-if="column.key === 'errorRate'">
              <span v-if="record.errorRate > 0" style="color: #ff4d4f">{{ formatRate(record.errorRate) }}</span>
              <span v-else>0%</span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </ds-container>
</template>

<style scoped>
.mb16 {
  margin-bottom: 16px;
}
.domain-search {
  margin-bottom: 10px;
}
.traffic-stat {
  text-align: center;
  padding: 8px 0;
  background: rgba(128, 128, 128, 0.08);
  border-radius: 6px;
}
.traffic-stat-value {
  font-size: 18px;
  font-weight: 600;
}
.traffic-stat-label {
  margin-top: 4px;
  color: #888;
  font-size: 12px;
}

.traffic-table :deep(.ant-table) {
  table-layout: fixed;
  width: 100%;
}
.traffic-table :deep(.ant-table-thead > tr > th) {
  white-space: nowrap;
}
.traffic-table :deep(.ant-table-tbody > tr > td) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-main {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  overflow: hidden;
  vertical-align: middle;
}
.cell-main :deep(.ant-tag),
.cell-main > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pin-btn {
  padding: 0 4px;
  height: auto;
  line-height: 1;
}
.pin-icon {
  font-size: 14px;
  color: #999;
}
.pin-icon-active {
  color: #faad14;
}
.sortable-header {
  cursor: pointer;
  user-select: none;
}
.sort-indicator {
  color: #999;
}
</style>
