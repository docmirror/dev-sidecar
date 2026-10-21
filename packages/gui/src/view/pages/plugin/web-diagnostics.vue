<script>
const DEFAULT_URL = 'https://github.com/'

function newSessionId () {
  if (globalThis.crypto?.randomUUID)
    return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default {
  name: 'WebDiagnostics',
  data () {
    return {
      url: DEFAULT_URL,
      activeUrl: 'about:blank',
      sessionId: newSessionId(),
      loading: false,
      logs: [],
      webview: null,
    }
  },
  computed: {
    logsText () {
      return this.logs.map(entry => JSON.stringify(entry, null, 2)).join('\n')
    },
  },
  mounted () {
    this.$api.ipc.on('diagnostics', this.onDiagnosticEvent)
    this.$nextTick(() => {
      this.webview = this.$refs.webview
      if (!this.webview)
        return
      this.webview.addEventListener('did-navigate', this.onNavigate)
      this.webview.addEventListener('did-navigate-in-page', this.onNavigate)
      this.startSessionAndLoad(this.sessionId, DEFAULT_URL, 'initial-load')
    })
  },
  beforeUnmount () {
    this.$api.ipc.removeListener('diagnostics', this.onDiagnosticEvent)
    if (this.webview) {
      this.webview.removeEventListener('did-navigate', this.onNavigate)
      this.webview.removeEventListener('did-navigate-in-page', this.onNavigate)
    }
    this.$api.diagnostics.stop(this.sessionId).catch(() => {})
  },
  methods: {
    trace (sessionId, message, details = null) {
      return this.$api.diagnostics.trace(sessionId, message, details).catch((error) => {
        console.debug('[web-diagnostics] trace failed', message, error)
      })
    },
    startSessionAndLoad (sessionId, targetUrl, reason) {
      this.trace(sessionId, 'session-start-requested', { targetUrl, reason })
      return this.$api.diagnostics.start(sessionId).then(() => {
        return this.trace(sessionId, 'session-started', { targetUrl, reason })
      }).then(() => {
        const webview = this.$refs.webview
        if (!webview)
          throw new Error('网页组件尚未就绪')
        this.webview = webview
        this.trace(sessionId, 'loadURL-called', { targetUrl, reason })
        return webview.loadURL(targetUrl)
      }).then(() => {
        return this.trace(sessionId, 'loadURL-resolved', { targetUrl, reason })
      }).catch((error) => {
        this.trace(sessionId, 'navigation-failed', { targetUrl, reason, message: error.message })
        this.$message.error(`页面导航失败：${error.message}`)
        throw error
      })
    },
    navigate (searchValue) {
      let value = String(searchValue ?? this.url ?? '').trim()
      if (!/^https?:\/\//i.test(value))
        value = `https://${value}`
      let parsed
      try {
        parsed = new URL(value)
        if (!['http:', 'https:'].includes(parsed.protocol))
          throw new Error('仅支持 HTTP/HTTPS')
      } catch (error) {
        this.$message.error(`网址无效：${error.message}`)
        return
      }

      const previousSessionId = this.sessionId
      const nextSessionId = newSessionId()
      this.url = parsed.href
      this.sessionId = nextSessionId
      this.logs = []
      this.trace(nextSessionId, 'navigate-clicked', { input: searchValue, parsedUrl: parsed.href, previousSessionId })

      this.$api.diagnostics.stop(previousSessionId)
        .catch((error) => {
          return this.trace(nextSessionId, 'previous-session-stop-failed', { message: error.message })
        })
        .then(() => this.startSessionAndLoad(nextSessionId, parsed.href, 'user-navigate'))
        .catch(() => {})
    },
    reload () {
      if (this.webview)
        this.webview.reload()
    },
    onNavigate (event) {
      if (event.url)
        this.url = event.url
      this.trace(this.sessionId, 'webview-navigated', { url: event.url || '', isMainFrame: event.isMainFrame })
    },
    onStartLoading () {
      this.loading = true
      this.trace(this.sessionId, 'webview-start-loading', { url: this.webview?.getURL?.() || '' })
    },
    onStopLoading () {
      this.loading = false
      this.trace(this.sessionId, 'webview-stop-loading', { url: this.webview?.getURL?.() || '' })
    },
    onDiagnosticEvent (event, entry) {
      if (entry?.sessionId === this.sessionId)
        this.logs.push(entry)
      else
        console.debug('[web-diagnostics] ignored event', entry)
    },
    onLoadError (event) {
      this.trace(this.sessionId, 'webview-load-failed', {
        errorCode: event.errorCode,
        errorDescription: event.errorDescription,
        validatedURL: event.validatedURL,
        isMainFrame: event.isMainFrame,
      })
      if (event.errorCode !== -3)
        this.$message.error(`页面加载失败：${event.errorDescription}`)
    },
    async clearLogs () {
      await this.$api.diagnostics.clear(this.sessionId)
      this.logs = []
    },
    async exportLogs () {
      const logs = await this.$api.diagnostics.getLogs(this.sessionId)
      if (Array.isArray(logs))
        this.logs = logs
      const result = await this.$api.diagnostics.export({ sessionId: this.sessionId })
      if (result?.path)
        this.$message.success(`日志已导出：${result.path}`)
    },
  },
}
</script>

<template>
  <div class="web-diagnostics">
    <a-card title="网页诊断">
      <a-space direction="vertical" style="width: 100%">
        <a-input-search
          :value="url"
          enter-button="访问"
          placeholder="输入 https:// 开头的网站地址"
          @update:value="url = $event"
          @search="navigate"
        />
        <a-alert
          type="info"
          show-icon
          message="此页面仅收集本诊断会话的请求记录；不会把其他应用流量混入导出文件。"
        />
        <a-space>
          <a-button @click="reload">
            刷新
          </a-button>
          <a-button @click="clearLogs">
            清空日志
          </a-button>
          <a-button type="primary" :disabled="logs.length === 0" @click="exportLogs">
            导出日志
          </a-button>
        </a-space>
        <div class="web-frame-wrap">
          <webview
            ref="webview"
            src="about:blank"
            partition="persist:dev-sidecar-diagnostics"
            webpreferences="contextIsolation=yes,sandbox=yes"
            @did-start-loading="onStartLoading"
            @did-stop-loading="onStopLoading"
            @did-fail-load="onLoadError"
          />
          <a-spin v-if="loading" class="loading" />
        </div>
        <a-collapse>
          <a-collapse-panel key="logs" :header="`本次会话日志（${logs.length}）`">
            <pre class="logs">{{ logsText }}</pre>
          </a-collapse-panel>
        </a-collapse>
      </a-space>
    </a-card>
  </div>
</template>

<style scoped>
.web-frame-wrap {
  position: relative;
  height: 560px;
  border: 1px solid #e8e8e8;
}
webview {
  width: 100%;
  height: 100%;
  border: 0;
}
.loading {
  position: absolute;
  inset: 45% auto auto 50%;
}
.logs {
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
