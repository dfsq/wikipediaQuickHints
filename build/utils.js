const fs = require('fs-extra')

function transformManifest (src, callback) {
  const json = fs.readJsonSync(src)
  return fs.writeJson(src, callback(json), { spaces: 2 })
}

module.exports = {
  transformManifest,
}
