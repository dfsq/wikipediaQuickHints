module.exports = [
  {
    name: 'Chrome',
    manifest (json) {
      delete json.applications
      return json
    },
  },
  {
    name: 'Firefox',
  },
]
