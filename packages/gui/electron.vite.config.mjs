import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'
import fs from 'fs'

// 复制 mitmproxy.js 到输出目录的插件
function copyMitmproxyPlugin() {
  return {
    name: 'copy-mitmproxy',
    closeBundle() {
      const src = resolve(__dirname, 'src/main/bridge/mitmproxy.js')
      const dest = resolve(__dirname, 'out/main/mitmproxy.js')
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest)
        console.log('✓ mitmproxy.js copied to out/main/')
      }
    }
  }
}

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
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
    plugins: [
      externalizeDepsPlugin(),
      copyMitmproxyPlugin()
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/main'),
      },
    },
    define: {
      'global.GENTLY': true,
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(__dirname, 'src/preload/index.js'),
        formats: ['cjs'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        external: ['electron'],
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    base: './',
    publicDir: resolve(__dirname, 'public'),
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
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
        '@': resolve(__dirname, 'src/renderer/src')
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
