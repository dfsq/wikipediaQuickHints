const fs = require('fs-extra')
const path = require('path')

/** @type {[ { name: String, manifest: Function }]} */
const platforms = require('./platforms')

platforms
  .filter(platform => typeof platform.manifest === 'function')
  .forEach(function ({ name, manifest }) {
    const srcPath = path.resolve(__dirname, `../dist/${name}/manifest.json`)
    const json = fs.readJsonSync(srcPath)

    fs.writeJson(srcPath, manifest(json), { spaces: 2 })
      .then(() => console.log(`Wrote manifest for ${name}`))
      .catch(() => console.log(`Could not write manifest for ${name}`))
  })
