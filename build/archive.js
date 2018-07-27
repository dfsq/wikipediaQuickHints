const fs = require('fs-extra')
const path = require('path')
const archiver = require('archiver')

const platforms = require('./platforms')

const { version } = fs.readJsonSync(path.resolve(__dirname, '../manifest.json'))

const archiving = platforms.map((platform) => {
  const src = path.resolve(__dirname, `../dist/${platform.name}`)
  const dest = path.resolve(__dirname, `../dist/${platform.name}_v${version}.zip`)

  return createArchive(src, dest)
    .then(() => console.log(`Created archive for ${platform.name}.`))
    .catch(() => {
      throw `Could not create archive for ${platform.name}.`
    })
})

Promise.all(archiving)
  .catch((err) => {
    console.log(`Could not create archives.`, err)
  })

function createArchive (src, dest) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(dest)
    const archive = archiver('zip', {})

    output.on('close', resolve)
    archive.on('error', reject)
    archive.directory(src, false);
    archive.pipe(output)
    archive.finalize();
  })
}
