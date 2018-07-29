const fs = require('fs-extra')
const path = require('path')

const { transformManifest } = require('./utils')
const platforms = require('./platforms')

platforms
  .forEach(function ({ name, manifest }) {
    const srcPath = path.resolve(__dirname, `../dist/${name}/manifest.json`)
    const json = fs.readJsonSync(srcPath)

    transformManifest(srcPath, manifest)
      .then(() => console.log(`Wrote manifest for ${name}.`))
      .catch(() => console.log(`Could not write manifest for ${name}.`))
  })
