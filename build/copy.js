const path = require('path')
const fs = require('fs-extra')

/** @type {[ { name: String, manifest: Function }]} */
const platforms = require('./platforms')

function resolve (src) {
  return path.resolve(__dirname, src)
}

const copySources = (platform) => {
  return {
    [resolve('../src/background')]: resolve(`../dist/${platform}/src/background`),
    [resolve('../src/inject')]: resolve(`../dist/${platform}/src/inject`),
    [resolve('../dist/page-action')]: resolve(`../dist/${platform}/src/page-action`),
    [resolve('../icons')]: resolve(`../dist/${platform}/icons`),
    [resolve('../_locales')]: resolve(`../dist/${platform}/_locales`),
    [resolve('../manifest.json')]: resolve(`../dist/${platform}/manifest.json`)
  }
}

const copyPromises = []

platforms.forEach((platform) => {
  console.group(`Copying for ${platform.name}.`)

  Object.entries(copySources(platform.name)).forEach(([src, dest]) => {
    const copying = fs.copy(src, dest)
      .catch(err => {
        console.log(`Could not copy ${src} to ${dest}.`)
      })

    copyPromises.push(copying)
  })

  console.groupEnd()
})

// Remove dist/page-action, won't need it anymore
Promise.all(copyPromises).then(() => {
  fs.remove(resolve('../dist/page-action'))
    .catch(() => {
      console.log('Could not remove dist/page-action.')
    })
})
