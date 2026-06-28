import { ref, computed } from 'vue'
import { theme } from 'ant-design-vue'

// 主题类型：light-亮色, dark-暗色, system-跟随系统
export const themeMode = ref('dark')

// 实际应用的主题（system模式下会根据系统主题计算）
export const appliedTheme = ref('dark')

// 系统主题媒体查询
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

/**
 * 获取系统主题
 * @returns {'dark' | 'light'}
 */
function getSystemTheme() {
  return mediaQuery.matches ? 'dark' : 'light'
}

/**
 * 应用主题到 DOM
 * @param {'dark' | 'light'} theme
 */
function applyThemeToDOM(theme) {
  appliedTheme.value = theme
  document.documentElement.setAttribute('data-theme', theme)
  // 同步到 body，确保 Teleport 渲染的组件（Select下拉、Modal、Drawer等）也能应用主题
  document.body.setAttribute('data-theme', theme)
}

/**
 * 更新主题
 * 根据 themeMode 的值计算并应用实际主题
 */
export function updateTheme() {
  const actualTheme = themeMode.value === 'system'
    ? getSystemTheme()
    : themeMode.value

  applyThemeToDOM(actualTheme)
}

/**
 * 设置主题模式
 * @param {'light' | 'dark' | 'system'} mode
 */
export function setThemeMode(mode) {
  themeMode.value = mode
  updateTheme()
}

/**
 * 初始化主题系统
 * 应在应用挂载时调用
 * @param {'light' | 'dark' | 'system'} initialMode - 初始主题模式
 */
export function initTheme(initialMode = 'dark') {
  themeMode.value = initialMode
  updateTheme()

  // 监听系统主题变化
  const handleSystemThemeChange = () => {
    if (themeMode.value === 'system') {
      updateTheme()
    }
  }

  // 添加监听器
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  } else {
    // 兼容旧版浏览器
    mediaQuery.addListener(handleSystemThemeChange)
  }

  // 返回清理函数
  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    } else {
      mediaQuery.removeListener(handleSystemThemeChange)
    }
  }
}

/**
 * 获取 Ant Design 主题配置
 * @param {boolean} isDarkTheme - 是否为暗色主题
 * @returns {Object} Ant Design 主题配置对象
 */
export function getAntThemeConfig(isDarkTheme) {
  return {
    algorithm: isDarkTheme
      ? theme.darkAlgorithm
      : theme.defaultAlgorithm,
    token: isDarkTheme
      ? {
          colorBgBase: '#1e1f22',
          colorTextBase: '#dddddd',
          colorBgContainer: '#1e1f22',
        }
      : {
          colorBgBase: '#ffffff',
          colorTextBase: '#333333',
          colorBgContainer: '#ffffff',
        },
  }
}

/**
 * 在组件中使用主题的组合式函数
 * 提供响应式的主题状态和切换方法
 */
export function useTheme() {
  // 计算属性：是否为暗色主题
  const isDark = computed(() => appliedTheme.value === 'dark')

  // 计算属性：是否为亮色主题
  const isLight = computed(() => appliedTheme.value === 'light')

  // 计算属性：当前是否为跟随系统模式
  const isSystem = computed(() => themeMode.value === 'system')

  // Ant Design 主题配置
  const antThemeConfig = computed(() => getAntThemeConfig(isDark.value))

  return {
    themeMode,
    appliedTheme,
    isDark,
    isLight,
    isSystem,
    setThemeMode,
    updateTheme,
    antThemeConfig,
  }
}

// 为了兼容旧代码，保留 colorTheme 导出
export const colorTheme = appliedTheme
