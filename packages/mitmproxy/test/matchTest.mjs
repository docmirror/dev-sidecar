const name = '/docmirror/dev-sidecar/raw/master/doc/index.png'
// https://raw.fastgit.org/docmirror/dev-sidecar/master/doc/index.png
const ret = name.replace(/^(.+)\/raw\/(.+)$/, 'raw.fastgit.org$1/$2')
console.log(ret)
