const publishUrl = process.env.VUE_APP_PUBLISH_URL
const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'dev-sidecar',
  productName: 'dev-sidecar',
  artifactName: 'DevSidecar-${version}-${arch}.${ext}',
  copyright: 'Copyright © 2020-2026 Greper, WangLiang, CuteOmega',
  directories: {
    output: 'dist_electron',
  },
  files: [
    'dist/**/*',
    'src/**/*',
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
