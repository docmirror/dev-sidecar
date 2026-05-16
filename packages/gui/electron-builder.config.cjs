const publishUrl = process.env.VITE_PUBLISH_URL
const publishProvider = process.env.VITE_PUBLISH_PROVIDER

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
  files: [
    {
      from: 'out/main',
      to: 'out/main',
      filter: ['**/*'],
    },
    {
      from: 'out/renderer',
      to: 'out/renderer',
      filter: ['**/*'],
    },
    {
      from: 'out/preload',
      to: 'out/preload',
      filter: ['**/*'],
    },
    {
      from: 'src/main/bridge',
      to: 'out/main',
      filter: ['mitmproxy.js'],
    },
    'package.json',
    'extra/**/*',
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
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32', 'arm64'],
      },
    ],
  },
  linux: {
    icon: 'build/mac/',
    target: [
      {
        target: 'deb',
        arch: ['x64', 'arm64', 'armv7l'],
      },
      {
        target: 'AppImage',
        arch: ['x64', 'arm64', 'armv7l'],
      },
      {
        target: 'tar.gz',
        arch: ['x64', 'arm64', 'armv7l'],
      },
      {
        target: 'rpm',
        arch: ['x64', 'arm64', 'armv7l'],
      },
      {
        target: 'flatpak',
        arch: ['x64'],
      },
    ],
    appId: 'cn.docmirror.DevSidecar',
    category: 'System',
  },
  mac: {
    icon: './build/mac/icon.icns',
    target: {
      target: 'dmg',
      arch: ['x64', 'arm64', 'universal'],
    },
    category: 'public.app-category.developer-tools',
  },
  publish: publishProvider
    ? {
        provider: publishProvider,
        url: publishUrl,
      }
    : undefined,
}
