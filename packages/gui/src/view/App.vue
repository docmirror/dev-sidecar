<script>
import * as Icons from '@ant-design/icons-vue';

import { ipcRenderer } from 'electron'
import createMenus from '@/view/router/menu'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { appliedTheme, initTheme, getAntThemeConfig } from './composables/theme'

export default {
  name: 'App',

  data() {
    return {
      locale: zhCN,
      info: {
        configProfiles: {
          internal: {},
          sharedRemote: {},
          personalRemote: {},
        },
      },
      config: undefined,
      configReadyPromise: null,
      selectedKeys: [],
      openKeys: ['/plugin'],
      menus: [],
      hideSearchBar: true,
      searchBarIsFocused: false,
      searchBarInputKeyupTimeout: null,
    }
  },

  computed: {
    theme() {
      return appliedTheme.value
    },
    themeConfig() {
      return getAntThemeConfig(this.theme === 'dark')
    },
    isPreRelease () {
      const version = this.info && this.info.version
      return typeof version === 'string' && version.includes('-')
    },
    // 预计算菜单图标引用，避免 ant-design-vue 渲染上下文无法访问 $options 方法
    menuIconMap () {
      const map = {}
      for (const item of this.menus) {
        const iconName = item.icon
          ? item.icon.replace(/(^|-)(\w)/g, (_, _s, c) => c.toUpperCase()) + 'Outlined'
          : 'FileOutlined'
        map[item.path] = Icons[iconName]
        if (item.children) {
          for (const child of item.children) {
            const cIconName = child.icon
              ? child.icon.replace(/(^|-)(\w)/g, (_, _s, c) => c.toUpperCase()) + 'Outlined'
              : 'FileOutlined'
            map[child.path] = Icons[cIconName]
          }
        }
      }
      return map
    },
  },

  created() {
    this.menus = createMenus(this)
    this.configReadyPromise = this.refreshConfigAndInfo()
    ipcRenderer.on('config.changed', this.onConfigChanged)

    ipcRenderer.on('search-bar', (_, message) => {
      if (window.config.disableSearchBar) {
        this.hideSearchBar = true
        return
      }

      // 如果不是显示/隐藏操作，并且还未显示检索框，先按显示操作处理
      if (!message.key.includes('hide') && this.hideSearchBar) {
        message = { key: 'show-hide' }
      }

      try {
        if (message.key === 'show-hide') { // 显示/隐藏
          const hide = message.hideSearchBar != null ? message.hideSearchBar : !this.hideSearchBar

          // 如果为隐藏操作，但SearchBar未隐藏且未获取焦点，则获取焦点
          if (hide && !this.hideSearchBar && !this.searchBarIsFocused) {
            this.doSearchBarInputFocus()
            return
          }

          this.hideSearchBar = hide

          // 显示后，获取输入框焦点
          if (!this.hideSearchBar) {
            this.doSearchBarInputFocus()
          }
        } else if (message.key === 'search-next') { // 下一个
          this.doSearchBarSearch(message)
        } else if (message.key === 'search-previous') { // 上一个
          this.doSearchBarSearch(message, true)
        }
      } catch (e) {
        console.error('search-bar event handle error:', e)
      }
    })
  },

  async mounted() {
    if (this.configReadyPromise) {
      await this.configReadyPromise
    }

    // 初始化主题系统
    const appConfig = (this.config && this.config.app) || (this.$global && this.$global.config && this.$global.config.app) || {}
    const initialThemeMode = appConfig.theme || 'dark'
    this.cleanupTheme = initTheme(initialThemeMode)

    // 设置默认选中的菜单项
    this.updateSelectedKeys(this.$route.fullPath)
  },

  beforeUnmount() {
    ipcRenderer.removeListener('config.changed', this.onConfigChanged)
    // 清理主题监听器
    if (this.cleanupTheme) {
      this.cleanupTheme()
    }
  },

  methods: {
    async refreshConfigAndInfo() {
      try {
        const config = await this.$api.config.get()
        if (config) {
          this.config = config
          this.$global.config = config
        } else {
          this.config = this.config || this.$global.config || {}
        }
      } catch (e) {
        console.error('刷新配置出现异常：', e)
        this.config = this.config || this.$global.config || {}
      }

      try {
        this.info = await this.$api.info.get()
      } catch (e) {
        console.error('刷新信息出现异常：', e)
      }
    },
    async onConfigChanged() {
      await this.refreshConfigAndInfo()
    },
    updateSelectedKeys(currentPath) {
      for (const item of this.menus || []) {
        if (item.path === currentPath) {
          this.selectedKeys = [item.path]
          return
        }
        if (item.children) {
          for (const child of item.children) {
            if (child.path === currentPath) {
              this.selectedKeys = [child.path]
              if (!this.openKeys.includes(item.path)) {
                this.openKeys = [...this.openKeys, item.path]
              }
              return
            }
          }
        }
      }
      // 默认选中第一个菜单项
      if (this.menus && this.menus.length > 0) {
        this.selectedKeys = [this.menus[0].path]
      }
    },
    handleMenuClick({ key }) {
      console.log('menu click:', key)
      window.config.disableSearchBar = false
      this.$router.replace(key)
      this.selectedKeys = [key]
      // 确保点击子菜单项时父级保持展开
      for (const item of this.menus) {
        if (item.children) {
          for (const child of item.children) {
            if (child.path === key && !this.openKeys.includes(item.path)) {
              this.openKeys = [...this.openKeys, item.path]
              return
            }
          }
        }
      }
    },
    async openExternal(url) {
      await this.$api.ipc.openExternal(url)
    },
    doSearchBarInputFocus() {
      this.$nextTick(() => {
        const searchBarInput = document.getElementById('search-bar-input')
        if (searchBarInput) {
          searchBarInput.focus()
        }
      })
    },
    doSearchBarSearch(message, isPrevious) {
      this.$nextTick(() => {
        const searchBarInput = document.getElementById('search-bar-input')
        if (searchBarInput) {
          const event = new CustomEvent('search-bar-search', {
            detail: { keyword: searchBarInput.value, isPrevious }
          })
          document.dispatchEvent(event)
        }
      })
    },
    onSearchBarInput(value) {
      const event = new CustomEvent('search-bar-input', {
        detail: { keyword: value }
      })
      document.dispatchEvent(event)
    },
    onSearchBarInputKeyup(event) {
      if (this.searchBarInputKeyupTimeout) {
        clearTimeout(this.searchBarInputKeyupTimeout)
      }
      this.searchBarInputKeyupTimeout = setTimeout(() => {
        this.onSearchBarInput(event.target.value)
      }, 300)
    },
    onSearchBarFocus() {
      this.searchBarIsFocused = true
    },
    onSearchBarBlur() {
      this.searchBarIsFocused = false
    },
  },
}
</script>

<template>
  <a-config-provider :locale="locale" :theme="themeConfig">
    <div class="ds_layout">
      <a-layout>
        <a-layout-sider :style="{ background: theme === 'dark' ? '#1e1f22' : '#ffffff', overflowY: 'auto' }">
          <div class="logo" />
          <div class="aside">
            <a-menu
              mode="inline"
              v-model:selectedKeys="selectedKeys"
              v-model:openKeys="openKeys"
              @click="handleMenuClick"
            >
              <template v-for="item in menus" :key="item.path">
                <a-sub-menu v-if="item.children && item.children.length" :key="item.path">
                  <template #icon>
                    <component :is="menuIconMap[item.path]" />
                  </template>
                  <template #title>{{ item.title }}</template>
                  <a-menu-item v-for="child in item.children" :key="child.path">
                    {{ child.title }}
                  </a-menu-item>
                </a-sub-menu>
                <a-menu-item v-else :key="item.path">
                  <template #icon>
                    <component :is="menuIconMap[item.path]" />
                  </template>
                  {{ item.title }}
                </a-menu-item>
              </template>
            </a-menu>
          </div>
        </a-layout-sider>
        <a-layout>
          <!-- <a-layout-header>Header</a-layout-header> -->
          <a-layout-content>
            <div v-if="isPreRelease" class="pre-release-banner">
              当前运行的是测试版本，可能不稳定，请谨慎使用
            </div>
            <div v-show="!hideSearchBar" class="search-bar">
              <a-input
                id="search-bar-input"
                placeholder="搜索..."
                @keyup="onSearchBarInputKeyup"
                @focus="onSearchBarFocus"
                @blur="onSearchBarBlur"
              />
            </div>
            <div class="content-inner">
              <router-view id="document" />
            </div>
          </a-layout-content>
          <a-layout-footer>
            <div class="footer">
              <div>
                <label v-if="info.configProfiles.personalRemote.showLabel !== false">当前配置：</label>
                <!-- 后端api里，id的回退值是''而version的回退值是0（因为version始终应该是一个Number），所以为了不显示一个零蛋，version在前端需要再做个回退为'' -->
                <code>{{ info.configProfiles.internal.id }}{{ info.configProfiles.internal.id ? ':' : '-' }}{{ info.configProfiles.internal.version || '' }}</code>
                <code class="ml5">{{ info.configProfiles.sharedRemote.id }}{{ info.configProfiles.sharedRemote.id ? ':' : '-' }}{{ info.configProfiles.sharedRemote.version || '' }}</code>
                <code class="ml5">{{ info.configProfiles.personalRemote.id }}{{ info.configProfiles.personalRemote.id ? ':' : '-' }}{{ info.configProfiles.personalRemote.version || '' }}</code>
              </div>

              <div class="mt5">
                ©2020-{{ new Date().getFullYear() }} docmirror.cn by
                <a @click="openExternal('https://github.com/greper')">Greper</a>,
                <a @click="openExternal('https://github.com/wangliang181230')">WangLiang</a>,
                <a @click="openExternal('https://github.com/cute-omega')">CuteOmega</a>
                <span class="ml5">{{ info.version }}</span>
                <span v-if="isPreRelease" class="pre-release-tag">非正式版</span>
              </div>
            </div>
          </a-layout-footer>
        </a-layout>
      </a-layout>
    </div>
  </a-config-provider>
</template>

