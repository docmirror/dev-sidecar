const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')

const publishUrl = process.env.VUE_APP_PUBLISH_URL
if (publishUrl) {
  console.log('Publish url:', publishUrl)
}

module.exports = defineConfig({
  outputDir: 'dist',
  publicPath: './',
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'DevSidecar-给开发者的边车辅助工具',
    },
  },
  lintOnSave: false,
  configureWebpack: {
    optimization: {
      // 修复 webpack production 模式下 module concatenation (scope hoisting)
      // 导致 ant-design-vue 的 Symbol context key 被内联到不同作用域，
      // Menu.js 的 provide(key) 和 SubMenuList.js 的 inject(key) 使用不同的 Symbol 实例，
      // 导致 provide/inject 链断裂，波及：
      // - Menu → 菜单崩溃
      // - ConfigProvider → 暗色模式异常
      // - Select/Dropdown → 下拉框无法点开
      // - Form/Button → 布局错乱、颜色错误
      concatenateModules: false,
      splitChunks: {
        cacheGroups: {
          // 强制 ant-design-vue 打包到同一个 chunk，
          // 避免 provide/inject 的 Symbol 跨 chunk 不匹配
          antdv: {
            test: /[\\/]node_modules[\\/]ant-design-vue[\\/]/,
            name: 'chunk-ant-design-vue',
            chunks: 'all',
            priority: 20,
          },
        },
      },
    },
    plugins: [
      new webpack.DefinePlugin({ 'global.GENTLY': true }),
    ],
    externals: {
      electron: 'commonjs electron',
    },
    resolve: {
      fallback: {
        path: require.resolve('path-browserify'),
        fs: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.json5$/i,
          loader: 'json5-loader',
          options: {
            esModule: false,
          },
          type: 'javascript/auto',
        },
      ],
    },
  },
})
