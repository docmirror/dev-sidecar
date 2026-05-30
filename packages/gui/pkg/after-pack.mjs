import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))

function writeAppUpdateYmlForLinux (appOutDir) {
  const publishUrl = process.env.VUE_APP_PUBLISH_URL
  const publishProvider = process.env.VUE_APP_PUBLISH_PROVIDER
  // provider: generic
  // url: 'http://dev-sidecar.docmirror.cn/update/preview/'
  // updaterCacheDirName: '@docmirrordev-sidecar-gui-updater'
  const fileContent = `provider: ${publishProvider}
url: '${publishUrl}'
updaterCacheDirName: 'dev-sidecar-gui-updater'
`
  console.log('write linux app-update.yml,updateUrl:', publishUrl)
  const filePath = path.join(appOutDir, 'resources', 'app-update.yml')
  fs.writeFileSync(filePath, fileContent)
}

export default async function (context) {
  let targetPath
  let systemType
  if (context.packager.platform.nodeName === 'darwin') {
    targetPath = path.join(context.appOutDir, `${context.packager.appInfo.productName}.app/Contents/Resources`)
    systemType = 'mac'
  } else if (context.packager.platform.nodeName === 'linux') {
    targetPath = path.join(context.appOutDir, './resources')
    systemType = 'linux'
    writeAppUpdateYmlForLinux(context.appOutDir)
  } else {
    targetPath = path.join(context.appOutDir, './resources')
    systemType = 'win'
  }
  const partUpdateFile = `update-${systemType}-${pkg.version}.zip`
  const outputPath = path.join(context.outDir, partUpdateFile)

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      console.log(`Created ${partUpdateFile}, size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`)
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)
    archive.directory(targetPath, false)
    archive.finalize()
  })
}
