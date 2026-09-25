<script>
import { defineComponent } from 'vue'
import { PlusOutlined, MinusOutlined, SyncOutlined, CheckOutlined } from '@ant-design/icons-vue'
import Plugin from '../../mixins/plugin'

export default defineComponent({
  name: 'P2pConnection',
  components: { PlusOutlined, MinusOutlined, SyncOutlined, CheckOutlined },
  mixins: [Plugin],

  data () {
    return {
      key: 'plugin.share',
      labelCol: { span: 4 },
      wrapperCol: { span: 20 },
      p2pPeerInput: '',
      shareLoading: false,
      shareInfo: {
        link: '',
        connectionMode: '未启动',
        publicHost: '',
        port: 0,
        nodeId: '',
      },
      peerStatus: {},
      redeemInput: '',
      redeemBusy: false,
    }
  },

  computed: {
    shareSetting () {
      if (!this.config) {
        return {}
      }
      if (!this.config.plugin) {
        this.config.plugin = {}
      }
      if (!this.config.plugin.share) {
        this.config.plugin.share = { enabled: false, setting: {} }
      }
      if (!this.config.plugin.share.setting) {
        this.config.plugin.share.setting = {}
      }
      const s = this.config.plugin.share.setting
      if (s.listenPort == null) {
        s.listenPort = 31288
      }
      if (s.listenHost == null) {
        s.listenHost = '0.0.0.0'
      }
      if (s.token == null) {
        s.token = ''
      }
      if (s.name == null) {
        s.name = ''
      }
      if (s.useUpnp == null) {
        s.useUpnp = true
      }
      if (!s.peers) {
        s.peers = []
      }
      return s
    },
    peerList () {
      return this.shareSetting.peers || []
    },
    shareEnabled () {
      return !!(this.config?.plugin?.share?.enabled)
    },
  },

  methods: {
    ready () {
      this.refreshShareInfo()
      this.probePeers()
    },
    async refreshShareInfo () {
      try {
        if (this.$api.plugin?.share?.getShareInfo) {
          const info = await this.$api.plugin.share.getShareInfo()
          this.shareInfo = {
            link: (info && info.link) || '',
            connectionMode: (info && info.connectionMode) || '未启动',
            publicHost: (info && info.publicHost) || '',
            port: (info && info.port) || 0,
            nodeId: (info && info.nodeId) || '',
          }
        } else {
          this.shareInfo.connectionMode = '未启动'
        }
      } catch {
        this.shareInfo.connectionMode = '未启动'
      }
    },
    async toggleShare (checked) {
      if (!this.$api.plugin?.share?.start) {
        this.$message.warning('当前运行时未包含 plugin.share')
        return
      }
      this.shareLoading = true
      try {
        if (checked) {
          await this.saveConfig()
          await this.$api.plugin.share.start()
          if (this.config.plugin.share) {
            this.config.plugin.share.enabled = true
          }
          this.$message.success('P2P节点分享已开启')
        } else {
          await this.$api.plugin.share.stop()
          if (this.config.plugin.share) {
            this.config.plugin.share.enabled = false
          }
          this.shareInfo = {
            link: '',
            connectionMode: '未启动',
            publicHost: '',
            port: 0,
          }
          this.$message.success('P2P节点分享已关闭')
        }
        await this.refreshShareInfo()
      } catch (e) {
        this.$message.error(`P2P节点分享失败: ${e.message || e}`)
      } finally {
        this.shareLoading = false
      }
    },
    /** token/端口改动后：重算链接（不再依赖启动时快照） */
    rebuildShareLink () {
      if (this.$api.plugin?.share?.getShareInfo) {
        return this.refreshShareInfo()
      }
      return Promise.resolve()
    },
    async copyShareLink () {
      const text = this.shareInfo.link
      if (!text) {
        this.$message.warning('暂无分享链接')
        return
      }
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        this.$message.success('已复制 ds-p2p 链接')
      } catch {
        this.$message.error('复制失败，请手动选中')
      }
    },
    async addP2pPeer () {
      const raw = (this.p2pPeerInput || '').trim()
      if (!raw) {
        return
      }
      try {
        await this.saveConfig()
        if (this.$api.plugin?.share?.addPeersFromText) {
          await this.$api.plugin.share.addPeersFromText(raw)
        } else if (this.$api.plugin?.share?.addPeer) {
          await this.$api.plugin.share.addPeer(raw)
        }
        this.p2pPeerInput = ''
        await this.reloadConfig()
        this.$message.success('已添加节点')
      } catch (e) {
        this.$message.error(`添加失败: ${e.message || e}`)
      }
    },
    async probePeers () {
      if (!this.$api.plugin?.share?.getPeerInfo) {
        return
      }
      for (const peer of this.peerList || []) {
        const key = `${peer.host}:${peer.port}`
        try {
          const res = await this.$api.plugin.share.getPeerInfo(peer)
          const body = res && res.body
          this.peerStatus[key] = {
            nodeId: (body && body.nodeId) || '',
            availableGb: body && body.availableGb != null ? body.availableGb : (body && body.quota ? body.quota.availableGb : null),
            usedGb: body && body.quota ? body.quota.usedGb : null,
            totalGb: body && body.quota ? body.quota.totalGb : null,
            ok: !!(res && res.status === 200),
          }
        } catch (e) {
          this.peerStatus[key] = { error: e.message || String(e), ok: false }
        }
      }
      this.peerStatus = { ...this.peerStatus }
    },
    async redeemOnPeers () {
      const card = (this.redeemInput || '').trim()
      if (!card) {
        return
      }
      const peers = this.peerList || []
      if (!peers.length) {
        this.$message.warning('请先添加节点')
        return
      }
      this.redeemBusy = true
      try {
        const r = await this.$api.plugin.share.redeemCardOnPeer(peers[0], card)
        if (r && r.ok) {
          this.$message.success('卡密兑换成功')
          this.redeemInput = ''
          await this.probePeers()
        } else {
          this.$message.error(`兑换失败: ${(r && r.reason) || 'unknown'}`)
        }
      } catch (e) {
        this.$message.error(`兑换失败: ${e.message || e}`)
      } finally {
        this.redeemBusy = false
      }
    },
    async removeP2pPeer (item, index) {
      try {
        if (this.$api.plugin?.share?.removePeer && item.host) {
          await this.$api.plugin.share.removePeer(item.host, item.port)
        }
        this.shareSetting.peers.splice(index, 1)
        await this.saveConfig()
      } catch (e) {
        this.$message.error(`删除失败: ${e.message || e}`)
      }
    },
  },
})
</script>

<template>
  <ds-container>
    <template #header>
      P2P 连接
    </template>
    <template #header-right>
      <span />
    </template>
    <div class="box">
      <a-form>
        <a-form-item label="P2P节点分享" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-switch
            :checked="shareEnabled"
            :loading="shareLoading"
            checked-children="开"
            un-checked-children="关"
            @change="toggleShare"
          />
          <div class="form-help">
            与首页「P2P节点分享」开关同步。需已解锁增强模式权限。
          </div>
        </a-form-item>
        <a-form-item label="连接方式" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-tag :color="shareEnabled ? 'green' : 'default'">
            {{ shareEnabled ? (shareInfo.connectionMode || '未知') : '未启动' }}
          </a-tag>
          <a-tag v-if="shareInfo.nodeId" color="purple">
            本机 {{ shareInfo.nodeId }}
          </a-tag>
        </a-form-item>
        <a-form-item label="监听端口" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input-number v-model:value="shareSetting.listenPort" :min="0" :max="65535" style="width:160px" />
          <a-checkbox v-model:checked="shareSetting.useUpnp" style="margin-left:16px">
            尝试 UPnP
          </a-checkbox>
          <div class="form-help">
            0 表示启动时在高端口范围随机挑选空闲端口
          </div>
        </a-form-item>
        <a-form-item label="Token" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model:value="shareSetting.token" placeholder="鉴权令牌" spellcheck="false" @change="rebuildShareLink" />
        </a-form-item>
        <a-form-item label="备注" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-input v-model:value="shareSetting.name" placeholder="家宽 / 公司" spellcheck="false" />
        </a-form-item>
        <a-form-item label="分享链接" :label-col="labelCol" :wrapper-col="wrapperCol">
          <div class="p2p-link-row">
            <a-input
              :value="shareInfo.link"
              readonly
              class="p2p-link-input"
              placeholder="开启分享后生成"
              spellcheck="false"
            />
            <a-button style="flex-shrink:0" @click="copyShareLink()">
              复制
            </a-button>
          </div>
          <div style="margin-top:8px">
            <a-button @click="rebuildShareLink()">
              <SyncOutlined />刷新链接
            </a-button>
          </div>
        </a-form-item>
        <a-form-item label="节点列表" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-row :gutter="10">
            <a-col :span="20">
              <a-input
                v-model:value="p2pPeerInput"
                type="textarea"
                :rows="2"
                placeholder="ds-p2p://...（可多行）"
                spellcheck="false"
              />
            </a-col>
            <a-col :span="4">
              <a-button type="primary" style="width:100%" @click="addP2pPeer()">
                <PlusOutlined />添加
              </a-button>
            </a-col>
          </a-row>
          <a-row v-for="(item, index) of peerList" :key="index" :gutter="10" style="margin-top:6px">
            <a-col :span="20">
              <a-tag color="blue">{{ item.name || item.host || '节点' }}</a-tag>
              <span class="form-help">{{ item.uri || `${item.host}:${item.port}` }}</span>
              <template v-if="peerStatus[`${item.host}:${item.port}`]">
                <a-tag v-if="peerStatus[`${item.host}:${item.port}`].nodeId" color="purple">
                  {{ peerStatus[`${item.host}:${item.port}`].nodeId }}
                </a-tag>
                <a-tag v-if="peerStatus[`${item.host}:${item.port}`].availableGb != null" color="cyan">
                  可用 {{ peerStatus[`${item.host}:${item.port}`].availableGb }} GB
                </a-tag>
                <a-tag v-else-if="peerStatus[`${item.host}:${item.port}`].ok" color="cyan">
                  可兑换
                </a-tag>
                <a-tag v-else color="red">
                  不可达
                </a-tag>
              </template>
            </a-col>
            <a-col :span="2">
              <a-button type="danger" @click="removeP2pPeer(item, index)"><MinusOutlined /></a-button>
            </a-col>
          </a-row>
          <a-row style="margin-top:10px">
            <a-col :span="16">
              <a-input v-model:value="redeemInput" placeholder="ds-card://... 兑换到第一个节点" spellcheck="false" />
            </a-col>
            <a-col :span="4">
              <a-button :loading="redeemBusy" type="primary" style="width:100%" @click="redeemOnPeers()">
                兑换卡密
              </a-button>
            </a-col>
            <a-col :span="4">
              <a-button style="width:100%" @click="probePeers()">
                刷新配额
              </a-button>
            </a-col>
          </a-row>
        </a-form-item>
      </a-form>
    </div>
    <template #footer>
      <div class="footer-bar">
        <a-button :loading="resetDefaultLoading" class="mr10" @click="resetDefault()">
          <SyncOutlined />恢复默认
        </a-button>
        <a-button :loading="applyLoading" type="primary" @click="apply()">
          <CheckOutlined />应用
        </a-button>
      </div>
    </template>
  </ds-container>
</template>

<style lang="scss">
.p2p-link-input {
  font-size: 13px;
  font-family: Consolas, Menlo, monospace;
}

.p2p-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

</style>
