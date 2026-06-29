const publishUrl = process.env.VUE_APP_PUBLISH_URL
const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER

// 本地开发自动检测当前平台和架构，CI 构建全部架构
const isCI = !!process.env.CI
const localArch = process.arch === 'ia32' ? 'ia32' : process.arch === 'arm64' ? 'arm64' : 'x64'

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'dev-sidecar',
  productName: 'dev-sidecar',
  artifactName: 'DevSidecar-${version}-${arch}.${ext}',
  copyright: 'Copyright © 2020-' + new Date().getFullYear() + ' Greper, WangLiang, CuteOmega',
  directories: {
    output: 'dist_electron',
    buildResources: 'build',
  },
  asar: {
    smartUnpack: true,
  },
  asarUnpack: [
    'src/bridge/mitmproxy.js',
    'dist/icon.png',
  ],
  files: [
    {
      from: 'dist',
      to: 'dist',
      filter: [
        '**/*',
        '!win-*/**/*',
        '!mac-*/**/*',
        '!linux-*/**/*',
        '!*.zip',
        '!*.dmg',
        '!*.blockmap',
        '!*.exe',
        '!*.AppImage',
        '!*.deb',
        '!*.rpm',
        '!*.tar.gz',
        '!*.flatpak',
        '!builder-*.yml',
        '!builder-*.yaml',
      ],
    },
    'src/**/*',
    'package.json',
    // extra/ 在 extraResources 中已复制，此处不需要再打包进 asar
  ],
  extraResources: [
    {
      from: 'extra',
      to: 'extra',
    },
  ],
  afterPack: './pkg/after-pack.cjs',
  afterAllArtifactBuild: './pkg/after-all-artifact-build.cjs',
  nsis: {
    oneClick: false,
    perMachine: true,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
  },
  win: {
    icon: 'build/icons/',
    signAndEditExecutable: isCI, // 本地开发跳过签名
    target: isCI
      ? [
          { target: 'nsis', arch: ['x64'] },
          { target: 'nsis', arch: ['ia32'] },
          { target: 'nsis', arch: ['arm64'] },
        ]
      : [
          { target: 'nsis', arch: [localArch] },
        ],
  },
  linux: {
    icon: 'build/mac/',
    target: isCI
      ? [
          { target: 'deb', arch: ['x64', 'arm64', 'armv7l'] },
          { target: 'AppImage', arch: ['x64', 'arm64', 'armv7l'] },
          { target: 'tar.gz', arch: ['x64', 'arm64', 'armv7l'] },
          { target: 'rpm', arch: ['x64', 'arm64', 'armv7l'] },
          { target: 'flatpak', arch: ['x64'] },
        ]
      : [
          { target: 'deb', arch: [localArch] },
          { target: 'AppImage', arch: [localArch] },
        ],
    appId: 'cn.docmirror.DevSidecar',
    category: 'System',
  },
  mac: {
    icon: './build/mac/icon.icns',
    target: isCI
      ? { target: 'dmg', arch: ['x64', 'arm64'] }
      : { target: 'dmg', arch: [localArch] },
    category: 'public.app-category.developer-tools',
  },
  publish: publishProvider
    ? {
        provider: publishProvider,
        url: publishUrl,
      }
    : undefined,
}
