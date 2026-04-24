<script>
import { defineComponent } from 'vue';
import * as Icons from '@ant-design/icons-vue';

import { ipcRenderer } from 'electron'
import createMenus from '@/view/router/menu'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { colorTheme } from './composables/theme'

export default defineComponent({
  name: 'App',

  components: {
    ...Icons,
  },

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
  },

  beforeUnmount () {
    ipcRenderer.removeListener('config.changed', this.onConfigChanged)
  },

  methods: {
    iconComp (icon) {
      if (!icon) return 'FileOutlined'
      const name = icon.replace(/(^|-)(\w)/g, (_, _s, c) => c.toUpperCase()) + 'Outlined'
      return name
    },
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
});
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
              :default-selected-keys="[$route.fullPath]"
              :default-open-keys="['/plugin']"
            >
              <template v-for="(item) of menus">
                <a-sub-menu v-if="item.children && item.children.length > 0" :key="'sub-' + item.path" @titleClick="titleClick(item)">
                  <template #title>
                    <span><component :is="iconComp(item.icon)" /><span>{{ item.title }}</span></span>
                  </template>
                  <a-menu-item v-for="(sub) of item.children" :key="sub.path" @click="menuClick(sub)">
                    <component :is="iconComp(sub.icon)" /> {{ sub.title }}
                  </a-menu-item>
                </a-sub-menu>
                <a-menu-item v-else :key="'item-' + item.path" @click="menuClick(item)">
                  <component :is="iconComp(item.icon)" />
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
  .ant-layout-sider {
    flex: 0 0 200px;
    max-width: 200px;
    min-width: 200px;
    width: 200px;
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
