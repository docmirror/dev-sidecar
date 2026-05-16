import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'

export default defineConfig({
  main: {
    // Electron 主进程配置
    build: {
      lib: {
        entry: 'src/background.js',
        formats: ['es'],
        fileName: () => 'index.js',
      },
      outDir: 'dist/main',
      rollupOptions: {
        external: [
          'electron',
          '@starknt/sysproxy',
          '@starknt/sysproxy-linux-arm64-gnu',
          '@starknt/shutdown-handler-napi',
          '@starknt/shutdown-handler-napi-linux-arm64-gnu',
        ],
      },
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    define: {
      'global.GENTLY': true,
    },
  },
  preload: {
    // 如果没有 preload 脚本，可以禁用
    build: {
      lib: {
        entry: 'src/preload.js',
        formats: ['es'],
        fileName: () => 'index.js',
      },
      outDir: 'dist/preload',
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    // 渲染进程配置
    root: '.',
    base: './',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('vue-router') || id.includes('ant-design-vue')) {
                return 'vendor'
              }
            }
          },
        },
      },
    },
    plugins: [
      vue(),
      vueJsx(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    define: {
      'global.GENTLY': true,
    },
    server: {
      port: 8080,
      open: false,
    },
  },
})
