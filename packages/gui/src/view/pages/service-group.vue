<script>
import { defineComponent } from 'vue'
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons-vue'
import Plugin from '../mixins/plugin'

export default defineComponent({
  name: 'ServiceGroup',

  components: {
    ReloadOutlined,
    SyncOutlined,
  },

  mixins: [Plugin],

  data () {
    return {
      key: 'serviceGroups',
      loading: false,
      restarting: false,
      needRestart: false,
      keyword: '',
      // 搜索方式：text=包含匹配，regex=正则匹配，hostname=匹配域名
      searchMode: 'text',
      searchError: '',
      matchLoading: false,
      matchedIds: [],
      matchTimer: null,
      catalog: null,
      pendingIds: [],
      resetVisible: false,
      resetSubmitting: false,
      resetItem: null,
      resetPart: null,
      editVisible: false,
      editSubmitting: false,
      editItem: null,
      editPart: null,
      editText: '',
      editError: '',
    }
  },

  computed: {
    normalGroups () {
      return this.filterGroups(this.catalog == null ? [] : this.catalog.groups)
    },
    enhancedGroups () {
      if (this.catalog == null || this.catalog.enhanced == null) {
        return []
      }
      return this.filterGroups(this.catalog.enhanced.groups)
    },
    enhancedEnabled () {
      return this.catalog != null && this.catalog.enhanced != null && this.catalog.enhanced.enabled === true
    },
    serverEnabled () {
      return this.status != null && this.status.server != null && this.status.server.enabled === true
    },
    totalCount () {
      return this.countItems(this.catalog == null ? [] : this.catalog.groups)
    },
    enabledCount () {
      return this.countEnabled(this.catalog == null ? [] : this.catalog.groups)
    },
    sourceLegend () {
      const sources = (this.catalog == null ? null : this.catalog.sources) || {}
      return [
        { id: sources.user, role: 'user', desc: '用户自行添加' },
        { id: sources.official, role: 'official', desc: '共享远程配置' },
        { id: sources.personal, role: 'personal', desc: '个人远程配置' },
        { id: sources.internal, role: 'internal', desc: '内置配置' },
      ].filter(item => item.id != null)
    },
    resetHasDefault () {
      return this.resetPart != null && this.resetPart.hasDefault === true
    },
    searchPlaceholder () {
      if (this.searchMode === 'regex') {
        return '输入正则表达式，如 \\.google\\.com$'
      }
      if (this.searchMode === 'hostname') {
        return '输入完整域名，如 www.google.com'
      }
      return '搜索域名 / 配置项（如 nat64） / 来源'
    },
  },

  methods: {
    async ready () {
      await this.refresh()
    },
    filterGroups (groups) {
      const keyword = this.keyword.trim().toLowerCase()

      // 匹配域名：由主进程按代理的匹配规则算出命中的服务
      if (this.searchMode === 'hostname') {
        if (keyword.length === 0) {
          return groups
        }
        const idSet = new Set(this.matchedIds)
        const result = []
        for (const group of groups) {
          const items = group.items.filter(item => idSet.has(item.id))
          if (items.length > 0) {
            result.push({ ...group, items })
          }
        }
        return result
      }

      if (keyword.length === 0) {
        return groups
      }

      // 正则匹配：把输入当正则表达式
      let regexp = null
      if (this.searchMode === 'regex') {
        try {
          regexp = new RegExp(this.keyword.trim(), 'i')
        } catch {
          return []
        }
      }

      const result = []
      for (const group of groups) {
        const items = group.items.filter((item) => {
          if (regexp != null) {
            return regexp.test(item.name)
              || (item.sources || []).some(source => regexp.test(source))
              || (item.parts || []).some(part => regexp.test(part.label || '') || regexp.test(part.section || ''))
          }
          if (item.name.toLowerCase().includes(keyword)) {
            return true
          }
          // 支持按配置来源搜索（例如：搜索 user 只显示用户自己添加的服务）
          if ((item.sources || []).some(source => source.toLowerCase().includes(keyword))) {
            return true
          }
          // 支持按配置项搜索（例如：搜索 nat64 / ech / 白名单，只显示配置了该项的服务）
          return (item.parts || []).some((part) => {
            return (part.label || '').toLowerCase().includes(keyword)
              || (part.section || '').toLowerCase().includes(keyword)
          })
        })
        if (items.length > 0) {
          result.push({ ...group, items })
        }
      }
      return result
    },
    /**
     * 搜索内容或搜索方式变化时触发（匹配域名需要请求主进程，做防抖）
     */
    onSearchChange () {
      this.searchError = ''
      if (this.matchTimer != null) {
        clearTimeout(this.matchTimer)
        this.matchTimer = null
      }
      if (this.searchMode === 'regex') {
        const text = this.keyword.trim()
        if (text.length > 0) {
          try {
            // eslint-disable-next-line no-new
            new RegExp(text, 'i')
          } catch (e) {
            this.searchError = `正则表达式无效：${e.message}`
          }
        }
        this.matchedIds = []
        return
      }
      if (this.searchMode !== 'hostname') {
        this.matchedIds = []
        return
      }
      const domain = this.keyword.trim()
      if (domain.length === 0) {
        this.matchedIds = []
        this.matchLoading = false
        return
      }
      this.matchLoading = true
      this.matchTimer = setTimeout(() => {
        this.matchTimer = null
        this.runHostnameMatch(domain)
      }, 300)
    },
    /**
     * 切换搜索方式
     */
    onSearchModeChange () {
      this.onSearchChange()
    },
    /**
     * 查找会作用于指定域名的配置
     * @param {string} domain 域名
     */
    async runHostnameMatch (domain) {
      try {
        const ret = await this.$api.serviceGroups.matchHostname({ domain })
        if (this.keyword.trim() !== domain) {
          return
        }
        this.matchedIds = ret == null || !Array.isArray(ret.ids) ? [] : ret.ids
      } catch (e) {
        this.searchError = `查找失败：${e.message}`
        this.matchedIds = []
      } finally {
        this.matchLoading = false
      }
    },
    /**
     * 判断配置来源对应的层级
     *
     * @param source 来源名称
     * @returns user / official / personal / internal / unknown
     */
    sourceRole (source) {
      const sources = (this.catalog == null ? null : this.catalog.sources) || {}
      if (source == null) {
        return 'unknown'
      }
      if (source === sources.user) {
        return 'user'
      }
      if (source === sources.personal) {
        return 'personal'
      }
      if (source === sources.official) {
        return 'official'
      }
      if (source === sources.internal) {
        return 'internal'
      }
      return 'unknown'
    },
    /**
     * 配置项标签的颜色：按配置来源区分
     *
     * @param part 配置项
     * @param officialColor 共享远程配置（official）使用的颜色
     */
    partTagColor (part, officialColor) {
      if (part.enabled !== true) {
        return 'default'
      }
      switch (this.sourceRole(part.source)) {
        case 'user':
          return 'green'
        case 'personal':
          return 'purple'
        case 'internal':
          return 'default'
        default:
          return officialColor
      }
    },
    /**
     * 图例的颜色：与配置项标签保持一致
     *
     * @param role 层级
     */
    legendColor (role) {
      switch (role) {
        case 'user':
          return 'green'
        case 'personal':
          return 'purple'
        case 'internal':
          return 'default'
        default:
          return 'blue'
      }
    },
    /**
     * 是否为用户自己添加/修改的配置项（可点击恢复默认）
     *
     * @param part 配置项
     */
    isUserPart (part) {
      return part != null && this.sourceRole(part.source) === 'user'
    },
    /**
     * 打开「修改配置」弹窗（左键点击）
     *
     * @param item 服务
     * @param part 配置项
     */
    openEdit (item, part) {
      if (!this.isUserPart(part)) {
        return
      }
      this.editItem = item
      this.editPart = part
      this.editText = JSON.stringify(part.currentValue, null, 2)
      this.editError = ''
      this.editVisible = true
    },
    closeEdit () {
      this.editVisible = false
      this.editItem = null
      this.editPart = null
      this.editError = ''
    },
    async confirmEdit () {
      if (this.editItem == null || this.editPart == null) {
        return
      }
      const item = this.editItem
      const part = this.editPart
      this.editSubmitting = true
      this.editError = ''
      try {
        const ret = await this.$api.serviceGroups.setPartValue({
          ids: [item.id],
          section: part.section,
          text: this.editText,
        })
        if (ret.ok !== true) {
          this.editError = ret.error || '修改失败'
          return
        }
        this.catalog = ret.catalog
        this.needRestart = true
        this.$message.success(`${item.name} 的「${part.label}」已修改`)
        this.closeEdit()
      } finally {
        this.editSubmitting = false
      }
    },
    /**
     * 打开「恢复默认」弹窗（右键点击）
     *
     * @param item 服务
     * @param part 配置项
     */
    openReset (item, part) {
      if (!this.isUserPart(part)) {
        return
      }
      this.resetItem = item
      this.resetPart = part
      this.resetVisible = true
    },
    closeReset () {
      this.resetVisible = false
      this.resetItem = null
      this.resetPart = null
    },
    async confirmReset () {
      if (this.resetItem == null || this.resetPart == null) {
        return
      }
      const item = this.resetItem
      const part = this.resetPart
      this.resetSubmitting = true
      try {
        const ret = await this.$api.serviceGroups.resetItems({ ids: [item.id], sections: [part.section] })
        this.catalog = ret.catalog
        if (ret.count > 0) {
          this.needRestart = true
          this.$message.success(this.resetHasDefault
            ? `${item.name} 的「${part.label}」已恢复默认`
            : `${item.name} 的「${part.label}」已删除`)
        } else {
          this.$message.warning('没有可恢复的配置项，请刷新后重试')
        }
        this.closeReset()
      } finally {
        this.resetSubmitting = false
      }
    },
    /**
     * 弹窗里显示配置值
     *
     * @param value 配置值
     */
    formatValue (value) {
      if (value === undefined) {
        return '（默认配置里没有这一项）'
      }
      if (value === null) {
        return 'null（已在你的配置里关闭）'
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return `${value}`
    },
    countItems (groups) {
      return groups.reduce((total, group) => total + group.items.length, 0)
    },
    countEnabled (groups) {
      return groups.reduce((total, group) => total + group.items.filter(item => item.enabled).length, 0)
    },
    enabledCountOf (group) {
      return group.items.filter(item => item.enabled).length
    },
    isPending (item) {
      return this.pendingIds.includes(item.id)
    },
    async refresh () {
      this.loading = true
      try {
        this.catalog = await this.$api.serviceGroups.list()
        // 匹配域名模式下，目录变化后重新计算命中结果
        if (this.searchMode === 'hostname' && this.keyword.trim().length > 0) {
          await this.runHostnameMatch(this.keyword.trim())
        }
      } finally {
        this.loading = false
      }
    },
    async setEnabled (ids, enabled, tip) {
      if (ids.length === 0) {
        return
      }
      this.pendingIds = [...this.pendingIds, ...ids]
      try {
        const ret = await this.$api.serviceGroups.setEnabled({ ids, enabled })
        this.catalog = ret.catalog
        this.needRestart = true
        this.$message.success(tip)
      } finally {
        this.pendingIds = this.pendingIds.filter(id => !ids.includes(id))
      }
    },
    async setItemEnabled (item, enabled) {
      await this.setEnabled([item.id], enabled, `${item.name} 已${enabled ? '开启' : '关闭'}`)
    },
    async setGroupEnabled (group, enabled) {
      const ids = group.items.filter(item => item.enabled !== enabled).map(item => item.id)
      if (ids.length === 0) {
        this.$message.info(`「${group.name}」已经全部${enabled ? '开启' : '关闭'}`)
        return
      }
      await this.setEnabled(ids, enabled, `「${group.name}」已${enabled ? '全部开启' : '全部关闭'}（${ids.length}个服务）`)
    },
    async restartServer () {
      this.restarting = true
      try {
        await this.$api.server.restart()
        this.needRestart = false
        this.$message.success('代理服务已重启，配置已生效')
      } finally {
        this.restarting = false
      }
    },
  },
})
</script>

<template>
  <ds-container>
    <template #header>
      <span class="service-title">
        服务分组
        <span class="form-help">（共 {{ totalCount }} 个服务，已开启 {{ enabledCount }} 个）</span>
      </span>
    </template>
    <template #header-right>
      <span class="service-search-bar">
        <a-input-group compact class="service-search-group">
          <a-select v-model:value="searchMode" class="service-search-mode" :dropdown-match-select-width="false" @change="onSearchModeChange()">
            <a-select-option value="text">
              包含匹配
            </a-select-option>
            <a-select-option value="regex">
              正则匹配
            </a-select-option>
            <a-select-option value="hostname">
              匹配域名
            </a-select-option>
          </a-select>
          <a-input
            v-model:value="keyword" class="service-search" :placeholder="searchPlaceholder" allow-clear spellcheck="false"
            @change="onSearchChange()"
          />
        </a-input-group>
        <a-button class="ml10" :loading="loading" @click="refresh()">
          <SyncOutlined />刷新
        </a-button>
      </span>
    </template>

    <div v-if="catalog">
      <div class="form-help service-tip">
        分组名读取自配置文件的 <code>//</code> 注释（<code>remote_config.json5</code>、<code>config.json</code>），
        <code>//</code> 之后的文字（去掉空格）即为组名，区分大小写。<br>
        一个服务对应它在 <code>拦截</code>、<code>预设IP</code>、<code>DNS</code>、<code>DNS族</code>、<code>ECH</code>、<code>NAT64</code>、<code>白名单</code>
        等配置里的所有配置项，关闭后会从配置中移除，重新开启时恢复。<br>
        配置来源：
        <a-tag v-for="item of sourceLegend" :key="item.id" class="legend-tag" :color="legendColor(item.role)">
          {{ item.id }}
        </a-tag>
        <span class="legend-desc">
          {{ sourceLegend.map(item => `${item.id} = ${item.desc}`).join('，') }}
          （也可在右上角搜索框里按来源筛选，例如输入 user；带 ⟲ 的 <span class="source-user">user</span> 标签：
          <b>左键点击</b>可修改该项配置，<b>右键点击</b>可恢复成默认配置里的值或删除）
        </span>
      </div>
      <div class="form-help service-search-tip">
        搜索方式：
        <b>包含匹配</b>按文字查找服务名（如 <code>google</code>）；
        <b>正则匹配</b>把输入当正则表达式匹配服务名 / 配置项 / 来源（如 <code>\.google\.com$</code>）；
        <b>匹配域名</b>输入一个完整域名，列出所有会作用于它的配置（含通配符与正则匹配串，规则与代理一致）。
      </div>
      <div v-if="searchError" class="service-search-error">
        <a-alert type="error" show-icon :message="searchError" />
      </div>
      <div v-else-if="searchMode === 'hostname' && keyword.trim().length > 0" class="service-search-result">
        <a-alert
          :type="matchLoading ? 'info' : (matchedIds.length > 0 ? 'success' : 'warning')" show-icon
          :message="matchLoading ? '正在查找…' : (matchedIds.length > 0
            ? `找到 ${matchedIds.length} 个会作用于「${keyword.trim()}」的配置`
            : `没有找到会作用于「${keyword.trim()}」的配置（该域名不会被任何配置拦截或改写）`)"
        />
      </div>
      <div v-if="needRestart" class="service-restart-tip">
        <a-alert
          type="warning" show-icon
          message="配置已保存，点击右下角「重启代理服务」后生效"
        />
      </div>

      <div v-for="group of normalGroups" :key="group.name" class="group-block">
        <div class="group-header">
          <span class="group-title" :title="group.name">{{ group.name }}</span>
          <span class="group-count">{{ enabledCountOf(group) }}/{{ group.items.length }}</span>
          <span class="group-actions">
            <a @click="setGroupEnabled(group, true)">全部开启</a>
            <a-divider type="vertical" />
            <a class="danger" @click="setGroupEnabled(group, false)">全部关闭</a>
          </span>
        </div>
        <a-row :gutter="[10, 10]">
          <a-col v-for="item of group.items" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
            <div class="service-card" :class="{ 'service-off': !item.enabled }">
              <div class="service-card-main" :title="`配置来源：${(item.sources || []).join('、')}`">
                <span class="service-name" :title="item.name">{{ item.name }}</span>
                <a-switch
                  :checked="item.enabled" :loading="isPending(item)" size="small"
                  @change="(checked) => setItemEnabled(item, checked)"
                />
              </div>
              <div class="service-tags">
                <a-tag
                  v-for="part of item.parts" :key="part.section" :color="partTagColor(part, 'blue')"
                  :class="{ 'part-clickable': isUserPart(part) }"
                  :title="isUserPart(part) ? '左键点击：修改配置；右键点击：恢复默认/删除' : ''"
                  @click="openEdit(item, part)"
                  @contextmenu.prevent="openReset(item, part)"
                >
                  {{ part.label }}{{ part.enabled ? '' : '（已关闭）' }}
                  <span v-if="part.source" class="part-source">{{ part.source }}</span>
                  <span v-if="isUserPart(part)" class="part-reset-icon">⟲</span>
                </a-tag>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>
      <a-empty v-if="normalGroups.length === 0" description="没有匹配的服务" />

      <a-divider />

      <div class="group-block">
        <div class="group-header">
          <span class="group-title">增强模式</span>
          <span class="form-help">（增强功能的域名配置，仅在开启增强模式后可见）</span>
        </div>
        <template v-if="enhancedEnabled">
          <div v-for="group of enhancedGroups" :key="group.name" class="group-block sub-block">
            <div class="group-header">
              <span class="group-title" :title="group.name">{{ group.name }}</span>
              <span class="group-count">{{ enabledCountOf(group) }}/{{ group.items.length }}</span>
              <span class="group-actions">
                <a @click="setGroupEnabled(group, true)">全部开启</a>
                <a-divider type="vertical" />
                <a class="danger" @click="setGroupEnabled(group, false)">全部关闭</a>
              </span>
            </div>
            <a-row :gutter="[10, 10]">
              <a-col v-for="item of group.items" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
                <div class="service-card" :class="{ 'service-off': !item.enabled }">
                  <div class="service-card-main" :title="`配置来源：${(item.sources || []).join('、')}`">
                    <span class="service-name" :title="item.name">{{ item.name }}</span>
                    <a-switch
                      :checked="item.enabled" :loading="isPending(item)" size="small"
                      @change="(checked) => setItemEnabled(item, checked)"
                    />
                  </div>
                  <div class="service-tags">
                    <a-tag
                      v-for="part of item.parts" :key="part.section" :color="partTagColor(part, 'orange')"
                      :class="{ 'part-clickable': isUserPart(part) }"
                      :title="isUserPart(part) ? '左键点击：修改配置；右键点击：恢复默认/删除' : ''"
                      @click="openEdit(item, part)"
                      @contextmenu.prevent="openReset(item, part)"
                    >
                      {{ part.label }}{{ part.enabled ? '' : '（已关闭）' }}
                      <span v-if="part.source" class="part-source">{{ part.source }}</span>
                      <span v-if="isUserPart(part)" class="part-reset-icon">⟲</span>
                    </a-tag>
                  </div>
                </div>
              </a-col>
            </a-row>
          </div>
          <a-empty v-if="enhancedGroups.length === 0" description="没有匹配的服务" />
        </template>
        <div v-else class="form-help">
          未开启增强模式：请先在「设置」中开启增强模式，开启后这里才会显示增强模式的服务分组。
        </div>
      </div>
    </div>
    <div v-else class="service-loading">
      <a-spin />
    </div>

    <template #footer>
      <div class="footer-bar">
        <a-button :loading="loading" @click="refresh()">
          <SyncOutlined />刷新
        </a-button>
        <a-button
          v-if="serverEnabled" class="ml10" type="primary" :loading="restarting"
          @click="restartServer()"
        >
          <ReloadOutlined />重启代理服务
        </a-button>
      </div>
    </template>

    <a-modal
      v-model:open="editVisible"
      title="修改配置"
      ok-text="保存"
      cancel-text="取消"
      width="620px"
      :confirm-loading="editSubmitting"
      @ok="confirmEdit()"
      @cancel="closeEdit()"
    >
      <div v-if="editItem && editPart" class="reset-body">
        <p>服务：<b>{{ editItem.name }}</b></p>
        <p>配置项：<b>{{ editPart.label }}</b>（来源：<span class="source-user">{{ editPart.source }}</span>）</p>
        <a-alert v-if="editError" type="error" show-icon :message="editError" class="mb10" />
        <a-textarea
          v-model:value="editText" class="edit-textarea" :rows="10" spellcheck="false"
          placeholder="配置值（JSON / JSON5 格式）"
        />
        <p class="reset-tip">
          直接编辑上面的配置值即可，保存后会写入你的 <code>config.json</code>（支持 JSON5：可写单引号、尾逗号、注释）。<br>
          想恢复成默认配置（内置 + 远程配置）里的值，请<b>右键点击</b>标签。
        </p>
      </div>
    </a-modal>

    <a-modal
      v-model:open="resetVisible"
      :title="resetHasDefault ? '恢复默认' : '删除配置项'"
      :ok-text="resetHasDefault ? '恢复默认' : '删除'"
      cancel-text="取消"
      :confirm-loading="resetSubmitting"
      @ok="confirmReset()"
      @cancel="closeReset()"
    >
      <div v-if="resetItem && resetPart" class="reset-body">
        <p>服务：<b>{{ resetItem.name }}</b></p>
        <p>配置项：<b>{{ resetPart.label }}</b>（来源：<span class="source-user">{{ resetPart.source }}</span>）</p>
        <p>你的配置：</p>
        <pre class="reset-value">{{ formatValue(resetPart.currentValue) }}</pre>
        <template v-if="resetHasDefault">
          <p>默认配置（内置 + 远程配置）：</p>
          <pre class="reset-value">{{ formatValue(resetPart.defaultValue) }}</pre>
          <p class="reset-tip">
            恢复后这一项会使用默认配置里的值，你配置里的内容会被删除。
          </p>
        </template>
        <p v-else class="reset-warn">
          默认配置里没有这一项，恢复后它会从你的配置里直接删除。
        </p>
      </div>
    </a-modal>
  </ds-container>
</template>

<style lang="scss">
.service-title {
  white-space: nowrap;
}
.service-search-bar {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.service-search {
  width: 190px;
}
.service-search-group {
  width: 290px;
}
.service-search-mode {
  width: 100px;
  margin-right: 0;
}
.service-search-tip {
  margin-top: -6px;
  margin-bottom: 10px;
}
.service-search-result,
.service-search-error {
  margin-bottom: 10px;
}
.service-tip {
  margin-bottom: 10px;
}
.service-restart-tip {
  margin-bottom: 10px;
}
.service-loading {
  text-align: center;
  padding-top: 100px;
}
.group-block {
  margin-bottom: 18px;
}
.group-block.sub-block {
  margin-left: 10px;
}
.group-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);

  .group-title {
    font-weight: 600;
    /* 全局 line-height 为 1.15（14px 文本仅 16.1px），配合 overflow:hidden 会把 g/q/y 等下伸部裁掉 */
    line-height: 22px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 70%;
  }
  .group-count {
    margin-left: 8px;
    color: var(--text-tertiary);
    font-size: 12px;
  }
  .group-actions {
    margin-left: auto;
    font-size: 12px;
    a.danger {
      color: #ff4d4f;
    }
  }
}
.service-card {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 8px;
  background-color: var(--card-bg);
  height: 100%;

  &.service-off {
    opacity: 0.55;
  }
  .service-card-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .service-name {
    /* 同上：避免 line-height 过小导致 g/q/y 等下伸部被 overflow:hidden 裁切 */
    line-height: 22px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 6px;
  }
  .service-tags {
    margin-top: 4px;
    line-height: 18px;

    .ant-tag {
      margin: 0 4px 0 0;
      font-size: 11px;
      line-height: 16px;
    }
    /* 配置项来源（internal / official / personal / user） */
    .part-source {
      margin-left: 3px;
      opacity: 0.7;
      font-size: 10px;
    }
  }
}
.legend-tag {
  margin: 0 2px 0 0;
  font-size: 11px;
  line-height: 16px;
}
.legend-desc {
  color: var(--text-tertiary);
  font-size: 12px;
}
.source-user {
  color: #52c41a;
}
/* 用户自己添加的配置项：可点击恢复默认 */
.ant-tag.part-clickable {
  cursor: pointer;
}
.part-reset-icon {
  margin-left: 2px;
  opacity: 0.75;
}
.reset-body {
  p {
    margin-bottom: 4px;
  }
  .source-user {
    color: #52c41a;
  }
  .reset-value {
    background-color: var(--code-block-bg);
    border-radius: 4px;
    padding: 6px 8px;
    margin-bottom: 10px;
    max-height: 160px;
    overflow: auto;
    font-size: 12px;
    line-height: 18px;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .reset-tip {
    color: var(--text-tertiary);
    margin-top: 8px;
  }
  .reset-warn {
    color: #faad14;
  }
}
/* 修改配置用的代码框 */
.edit-textarea {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 18px;
}
</style>
