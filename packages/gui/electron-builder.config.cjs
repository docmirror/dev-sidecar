const publishUrl = process.env.VUE_APP_PUBLISH_URL
const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER

// 本地开发自动检测当前平台和架构，CI 构建全部架构
const isCI = !!process.env.CI
const localArch = process.arch === 'ia32' ? 'ia32' : process.arch === 'arm64' ? 'arm64' : 'x64'

// 产物目录。默认放在仓库内（dist_electron），但工作区被打了 Low 完整性标签时，
// 产物（包括 NSIS 卸载器写出器）会继承 Low，Windows 便用 Low 令牌启动它，
// 而 Low 进程写不了 Medium 的 %TEMP%，打包会在 NSIS 那一步报
// “Error writing temporary file”。把输出指到工作区外（如 %LOCALAPPDATA%）可绕开。
const outputDir = process.env.DS_BUILD_OUTPUT || 'dist_electron'

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'dev-sidecar',
  electronVersion: '42.11.18', // 与 devDependency 实际解析到的版本一致（^42.11.16 → 42.11.18）；hoisted 布局下 builder 无法从 node_modules 推断版本，故显式钉住
  productName: 'dev-sidecar',
  artifactName: 'DevSidecar-${version}-${arch}.${ext}',
  copyright: 'Copyright © 2020-' + new Date().getFullYear() + ' Greper, WangLiang, CuteOmega',
  directories: {
    output: outputDir,
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
  // 按目标架构裁剪 koffi / @starknt 的非目标平台二进制（files 规则不支持 ${arch} 宏，
  // 只能在 beforePack 里往 platformSpecificBuildOptions.files 追加排除项）
  beforePack: './pkg/before-pack.cjs',
  afterPack: './pkg/after-pack.cjs',
  afterAllArtifactBuild: './pkg/after-all-artifact-build.cjs',
  nsis: {
    oneClick: false,
    perMachine: true,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    // 可选的全新安装 / 完全卸载：默认不动 ~/.dev-sidecar，由用户在安装选项页和卸载弹窗中决定（见 build/installer.nsh）
    include: 'installer.nsh',
  },
  win: {
    icon: 'build/icons/icon.ico',
    // 必须为 true 才会用 rcedit 写入 exe 图标和版本信息；
    // 未配置证书时 electron-builder 会自动跳过签名，不会失败。
    signAndEditExecutable: true,
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
    // 包名 @docmirror/dev-sidecar-gui 去 scope 后含 '@'，electron-builder 26.17+ 的
    // AppImage 目标会校验 executableName 合法字符，故显式指定不含 '@' 的可执行名
    executableName: 'dev-sidecar-gui',
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
      ? [
          { target: 'dmg', arch: ['x64', 'arm64'] },
          { target: 'zip', arch: ['x64', 'arm64'] },
        ]
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
