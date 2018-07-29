function commonManifestTransform (json) {
  if (process.env.NODE_ENV === 'production') {
    delete json.content_security_policy
  }

  if (typeof callback === 'function') {
    return callback(json)
  }

  return json
}

module.exports = [
  {
    name: 'Chrome',
    manifest: function (json) {
      json = commonManifestTransform(json)
      delete json.applications
      return json
    },
  },
  {
    name: 'Firefox',
    manifest: function (json) {
      return commonManifestTransform(json)
    }
  },
]
