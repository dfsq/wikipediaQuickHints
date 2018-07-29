const path = require('path')
const fs = require('fs-extra')

const platform = process.argv[2]

function resolve (src) {
  return path.resolve(__dirname, src)
}

const copySources = {
  [resolve('../src/background')]: resolve(`../dist/${platform}/src/background`),
  [resolve('../src/inject')]: resolve(`../dist/${platform}/src/inject`),
  [resolve('../icons')]: resolve(`../dist/${platform}/icons`),
  [resolve('../_locales')]: resolve(`../dist/${platform}/_locales`),
}

console.log(`Copying for ${platform}.`)

Object.entries(copySources).forEach(([src, dest]) => {
  fs.copy(src, dest)
    .catch(err => {
      console.log(`Could not copy ${src} to ${dest}.`)
    })
})
