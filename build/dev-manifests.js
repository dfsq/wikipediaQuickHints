const fs = require('fs-extra')
const path = require('path')

const platforms = require('./platforms')
const { transformManifest } = require('./utils')

const platform = process.argv[2]
const src = path.resolve(__dirname, '../manifest.json')
const dest = path.resolve(__dirname, `../dist/${platform}/manifest.json`)

// Copy manifest
fs.copySync(src, dest)

// Transform manifest
const callback = platforms.find(p => p.name === platform).manifest
transformManifest(dest, callback)

console.log(`Created manifest for ${platform}`)
