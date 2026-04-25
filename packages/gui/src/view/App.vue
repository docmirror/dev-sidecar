<script>
import { defineComponent, ref, computed, watch, h, getCurrentInstance } from 'vue';
import * as Icons from '@ant-design/icons-vue';

import { ipcRenderer } from 'electron'
import createMenus from '@/view/router/menu'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { colorTheme } from './composables/theme'

export default defineComponent({
  name: 'App',

  setup() {
    const instance = getCurrentInstance()
    const router = instance.appContext.config.globalProperties.$router
    const api = instance.appContext.config.globalProperties.$api
    const locale = ref(zhCN)
    const info = ref({
      configProfiles: {
        internal: {},
        sharedRemote: {},
        personalRemote: {},
      },
    })
    const config = ref(undefined)
    const configReadyPromise = ref(null)
    const selectedKeys = ref([])
    const openKeys = ref(['/plugin'])
    const menus = ref([])

    const themeClass = computed(() => `theme-${colorTheme.value}`)
    const theme = computed(() => colorTheme.value)

    // 将菜单数据转换为 items 格式
    const menuItems = computed(() => {
      return (menus.value || []).map(item => {
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
    })

    const updateSelectedKeys = (currentPath) => {
      // 查找匹配的菜单项
      for (const item of menus.value || []) {
        if (item.children && item.children.length > 0) {
          for (const sub of item.children) {
            if (sub.path === currentPath) {
              selectedKeys.value = [sub.path]
              return
            }
          }
        } else if (item.path === currentPath) {
          selectedKeys.value = [item.path]
          return
        }
      }
      // 默认选中第一个菜单项
      if (menus.value && menus.value.length > 0) {
        const firstItem = menus.value[0]
        if (firstItem.children && firstItem.children.length > 0) {
          selectedKeys.value = [firstItem.children[0].path]
        } else {
          selectedKeys.value = [firstItem.path]
        }
      }
    }

    const handleMenuClick = ({ key }) => {
      console.log('menu click:', key)
      window.config.disableSearchBar = false
      // 找到对应的菜单项
      for (const item of menus.value || []) {
        if (item.path === key) {
          router.replace(key)
          selectedKeys.value = [key]
          return
        }
        if (item.children) {
          for (const sub of item.children) {
            if (sub.path === key) {
              router.replace(key)
              selectedKeys.value = [key]
              return
            }
          }
        }
      }
    }

    const openExternal = async (url) => {
      await api.ipc.openExternal(url)
    }

    return {
      locale,
      info,
      config,
      configReadyPromise,
      selectedKeys,
      openKeys,
      menus,
      menuItems,
      themeClass,
      theme,
      updateSelectedKeys,
      handleMenuClick,
      openExternal,
    }
  },

  data() {
    return {
      // 兼容旧代码
    }
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

  created() {
    this.menus = createMenus(this)
    this.configReadyPromise = this.refreshConfigAndInfo()
    ipcRenderer.on('config.changed', this.onConfigChanged)
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
