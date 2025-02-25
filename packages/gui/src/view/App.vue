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
      info: {},
      menus: undefined,
      config: undefined,
      hideSearchBar: true,
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
  mounted () {
    let theme = this.config.app.theme
    if (this.config.app.theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    colorTheme.value = theme
  },
  created () {
    this.menus = createMenus(this)
    this.config = this.$global.config
    this.$api.info.get().then((ret) => {
      this.info = ret
    })

    ipcRenderer.on('search-bar', (_, message) => {
      if (window.config.disableSearchBar) {
        this.hideSearchBar = true
        return
      }

      // 如果不是显示/隐藏操作，并且还未显示检索框，先按显示操作处理
      if (message.key !== 'show-hide' && this.hideSearchBar) {
        message = { key: 'show-hide' }
      }

      try {
        if (message.key === 'show-hide') { // 显示/隐藏
          this.hideSearchBar = message.hideSearchBar != null ? message.hideSearchBar : !this.hideSearchBar

          // 显示后，获取输入框焦点
          if (!this.hideSearchBar) {
            setTimeout(() => {
              try {
                this.$refs.searchBar.$el.querySelector('input').focus()
              } catch {
              }
            }, 100)
          }
        } else if (message.key === 'next') { // 下一项
          this.$refs.searchBar.next()
        } else if (message.key === 'previous') { // 上一项
          this.$refs.searchBar.previous()
        }
      } catch (e) {
        console.error('操作SearchBar出现异常：', e)
      }
    })
  },
  methods: {
    titleClick (item) {
      console.log('title click:', item)
    },
    menuClick (item) {
      console.log('menu click:', item)
      window.config.disableSearchBar = false
      this.$router.replace(item.path)
    },
  },
}
</script>

<template>
  <a-config-provider :locale="locale">
    <div class="ds_layout" :class="themeClass">
      <SearchBar ref="searchBar"
                 :root="'#document'"
                 :highlightClass="'search-bar-highlight'"
                 :selectedClass="'selected-highlight'"
                 :hiden.sync="hideSearchBar"
                 style="inset:auto auto 53px 210px; background-color:#ddd"
      />
      <a-layout>
        <a-layout-sider :theme="theme">
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
              ©2020-2025 docmirror.cn by Greper, WangLiang  <span>{{ info.version }}</span>
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
.mt10 {
  margin-top: 10px;
}
.mt5 {
  margin-top: 5px;
}
.mt20 {
  margin-top: 20px;
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
