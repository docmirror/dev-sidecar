<script>
import { ipcRenderer } from 'electron'
import createMenus from '@/view/router/menu'
import zhCN from 'ant-design-vue/lib/locale-provider/zh_CN'
import { colorTheme } from './composables/theme'

export default {
  name: 'App',
  data () {
    return {
      locale: zhCN,
      info: {
        configProfiles: {
          internal: {},
          sharedRemote: {},
          personalRemote: {},
        },
      },
      menus: undefined,
      config: undefined,
      configReadyPromise: null,
      hideSearchBar: true,
      searchBarIsFocused: false,
      searchBarInputKeyupTimeout: null,
    }
  },
  computed: {
    themeClass () {
      return `theme-${colorTheme.value}`
    },
    theme () {
      return colorTheme.value
    },
  },
  async mounted () {
    if (this.configReadyPromise) {
      await this.configReadyPromise
    } // 强制在mounted之前等待created里对配置的刷新完成，以避免mounted里对this.config.app的访问为空

    const appConfig = (this.config && this.config.app) || (this.$global && this.$global.config && this.$global.config.app) || {} // this.$global.config 可能不是最新值，但它作为已有的配置用于兜底
    let theme = appConfig.theme || 'dark' // TODO: 这里可能存在一个问题，就是如果用户在系统主题为dark的情况下，app.theme是system，那么colorTheme会被设置为dark，但如果用户在app运行时将系统主题切换为light，colorTheme就不会更新了。后续可以考虑监听系统主题变化事件来动态更新colorTheme。
    if (appConfig.theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    colorTheme.value = theme
  },
  created () {
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
          } else {
            this.searchBarIsFocused = false
          }
        } else if (message.key === 'hide') { // 隐藏
          this.hideSearchBar = true
          this.searchBarIsFocused = false
        } else if (message.key === 'next') { // 下一项
          this.$refs.searchBar.next()
        } else if (message.key === 'previous') { // 上一项
          this.$refs.searchBar.previous()
        }
      } catch (e) {
        console.error('操作SearchBar出现异常：', e)
      }

      const input = this.getSearchBarInput()
      if (input) {
        input.addEventListener('focus', this.onSearchBarInputFocus)
        input.addEventListener('blur', this.onSearchBarInputBlur)
        input.addEventListener('keydown', this.onSearchBarInputKeydown)
        input.addEventListener('keyup', this.onSearchBarInputKeyup)
      }
    })
  },
  beforeDestroy () {
    ipcRenderer.removeListener('config.changed', this.onConfigChanged)
  },
  methods: {
    async refreshConfigAndInfo () {
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
    async onConfigChanged () {
      await this.refreshConfigAndInfo()
    },
    getSearchBarInput () {
      return this.$refs.searchBar.$el.querySelector('input[type=text]')
    },
    onSearchBarInputFocus () {
      this.searchBarIsFocused = true
    },
    onSearchBarInputBlur () {
      this.searchBarIsFocused = false
    },
    onSearchBarInputKeydown () {
      clearTimeout(this.searchBarInputKeyupTimeout)
    },
    onSearchBarInputKeyup (e) {
      if (!this.$refs.searchBar || e.key === 'Enter' || e.key === 'F3') {
        return
      }
      clearTimeout(this.searchBarInputKeyupTimeout)
      this.searchBarInputKeyupTimeout = setTimeout(() => {
        // 连续调用以下两个方法，为了获取检索结果中的第一项
        this.$refs.searchBar.next()
        this.$refs.searchBar.previous()
      }, 150)
    },
    doSearchBarInputFocus () {
      setTimeout(() => {
        const input = this.getSearchBarInput()
        if (input) {
          input.focus()
        }
      }, 100)
    },
    titleClick (item) {
      console.log('title click:', item)
    },
    menuClick (item) {
      console.log('menu click:', item)
      window.config.disableSearchBar = false
      this.$router.replace(item.path)
    },
    async openExternal (url) {
      await this.$api.ipc.openExternal(url)
    },
  },
}
</script>

<template>
  <a-config-provider :locale="locale">
    <div class="ds_layout" :class="themeClass">
      <SearchBar
        ref="searchBar"
        root="#document"
        highlight-class="search-bar-highlight"
        selected-class="selected-highlight"
        :hiden.sync="hideSearchBar"
        style="inset:auto auto 53px 210px; background-color:#ddd"
      />
      <a-layout>
        <a-layout-sider :theme="theme" style="overflow-y: auto">
          <div class="logo" />
          <div class="aside">
            <a-menu
              mode="inline"
              :default-selected-keys="[$route.fullPath]"
              :default-open-keys="['/plugin']"
            >
              <template v-for="(item) of menus">
                <a-sub-menu v-if="item.children && item.children.length > 0" :key="item.path" @titleClick="titleClick(item)">
                  <span slot="title"><a-icon :type="item.icon ? item.icon : 'file'" /><span>{{ item.title }}</span></span>
                  <a-menu-item v-for="(sub) of item.children" :key="sub.path" @click="menuClick(sub)">
                    <a-icon :type="sub.icon ? sub.icon : 'file'" /> {{ sub.title }}
                  </a-menu-item>
                </a-sub-menu>
                <a-menu-item v-else :key="item.path" @click="menuClick(item)">
                  <a-icon :type="item.icon ? item.icon : 'file'" />
                  <span class="nav-text">{{ item.title }}</span>
                </a-menu-item>
              </template>
            </a-menu>
          </div>
        </a-layout-sider>
        <a-layout>
          <!-- <a-layout-header>Header</a-layout-header> -->
          <a-layout-content>
            <router-view id="document" />
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
                ©2020-2026 docmirror.cn by
                <a @click="openExternal('https://github.com/greper')">Greper</a>,
                <a @click="openExternal('https://github.com/wangliang181230')">WangLiang</a>,
                <a @click="openExternal('https://github.com/cute-omega')">CuteOmega</a>
                <span class="ml5">{{ info.version }}</span>
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
  .ant-layout-sider-children {
    border-right: 1px solid #eee;
  }
  .ant-layout {
    height: 100%;
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
  }
  .ant-menu-inline,
  .ant-menu-vertical,
  .ant-menu-vertical-left {
    border: 0;
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
