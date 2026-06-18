<script>
import { h } from 'vue';
import * as Icons from '@ant-design/icons-vue';

import { ipcRenderer } from 'electron'
import createMenus from '@/view/router/menu'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { colorTheme } from './composables/theme'

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
    themeClass() {
      return `theme-${this.theme}`
    },
    theme() {
      return colorTheme.value
    },
    // 将菜单数据转换为 items 格式
    menuItems() {
      return (this.menus || []).map(item => {
        const iconName = item.icon
          ? item.icon.replace(/(^|-)(\w)/g, (_, _s, c) => c.toUpperCase()) + 'Outlined'
          : 'FileOutlined'
        const IconComponent = Icons[iconName]

        if (item.children && item.children.length > 0) {
          return {
            key: item.path,
            icon: () => h(IconComponent),
            label: item.title,
            children: item.children.map(child => {
              const childIconName = child.icon
                ? child.icon.replace(/(^|-)(\w)/g, (_, _s, c) => c.toUpperCase()) + 'Outlined'
                : 'FileOutlined'
              const ChildIconComponent = Icons[childIconName]
              return {
                key: child.path,
                icon: () => h(ChildIconComponent),
                label: child.title,
              }
            }),
          }
        }
        return {
          key: item.path,
          icon: () => h(IconComponent),
          label: item.title,
        }
      })
    },
    isPreRelease () {
      const version = this.info && this.info.version
      return typeof version === 'string' && version.includes('-')
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

    const appConfig = (this.config && this.config.app) || (this.$global && this.$global.config && this.$global.config.app) || {}
    let theme = appConfig.theme || 'dark'
    if (appConfig.theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    colorTheme.value = theme

    // 设置默认选中的菜单项
    this.updateSelectedKeys(this.$route.fullPath)
  },

  beforeUnmount() {
    ipcRenderer.removeListener('config.changed', this.onConfigChanged)
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
      // 查找匹配的菜单项
      for (const item of this.menus || []) {
        if (item.children && item.children.length > 0) {
          for (const sub of item.children) {
            if (sub.path === currentPath) {
              this.selectedKeys = [sub.path]
              return
            }
          }
        } else if (item.path === currentPath) {
          this.selectedKeys = [item.path]
          return
        }
      }
      // 默认选中第一个菜单项
      if (this.menus && this.menus.length > 0) {
        const firstItem = this.menus[0]
        if (firstItem.children && firstItem.children.length > 0) {
          this.selectedKeys = [firstItem.children[0].path]
        } else {
          this.selectedKeys = [firstItem.path]
        }
      }
    },
    handleMenuClick({ key }) {
      console.log('menu click:', key)
      window.config.disableSearchBar = false
      // 找到对应的菜单项
      for (const item of this.menus || []) {
        if (item.path === key) {
          this.$router.replace(key)
          this.selectedKeys = [key]
          return
        }
        if (item.children) {
          for (const sub of item.children) {
            if (sub.path === key) {
              this.$router.replace(key)
              this.selectedKeys = [key]
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
  <a-config-provider :locale="locale">
    <div class="ds_layout" :class="themeClass">
      <a-layout>
        <a-layout-sider :theme="theme" style="overflow-y: auto">
          <div class="logo" />
          <div class="aside">
            <a-menu
              mode="inline"
              v-model:selectedKeys="selectedKeys"
              v-model:openKeys="openKeys"
              :items="menuItems"
              @click="handleMenuClick"
            />
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

<style lang="scss">
body {
  height: 100%;
}
.ds_layout {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100%;
  .ant-layout-has-sider {
    border: 1px solid #eee;
  }
  .ant-layout-sider {
    flex: 0 0 200px;
    max-width: 200px;
    min-width: 200px;
    width: 200px;
  }
  .ant-layout-sider-children {
    border-right: 1px solid #eee;
  }
  > .ant-layout {
    height: 100%;
  }
  > .ant-layout > .ant-layout {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .ant-layout-content {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .content-inner {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }
  .logo {
    padding: 5px;
    border-bottom: #eee solid 1px;
    height: 60px;
    background-image: url('../../public/logo/logo-lang.svg');
    background-size: auto 50px;
    background-repeat: no-repeat;
    background-position: 5px center;
  }
  .ant-layout-footer {
    padding: 10px;
    text-align: center;
    border-top: #d6d4d4 solid 1px;
    flex: 0 0 auto;
    background: #fff;
    position: relative;
    z-index: 1;
  }
  .ant-menu-inline,
  .ant-menu-vertical,
  .ant-menu-vertical-left {
    border: 0;
  }

  .pre-release-banner {
    margin: 0 12px 12px;
    padding: 10px 12px;
    border: 1px solid #ffa940;
    background: #fff7e6;
    color: #ad4e00;
    font-weight: 600;
    border-radius: 6px;
    text-align: center;
  }

  .pre-release-tag {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 8px;
    border-radius: 999px;
    border: 1px solid #ffa940;
    background: #fff7e6;
    color: #ad4e00;
    font-size: 12px;
    line-height: 20px;
  }

  .search-bar {
    padding: 12px;
    border-bottom: 1px solid #eee;
    background: #fff;
  }
}
.search-bar-highlight {
  background-color: #ef0fff;
  color: #fdfdfd;

  &.selected-highlight {
    background-color: #17a450;
  }
}
</style>
