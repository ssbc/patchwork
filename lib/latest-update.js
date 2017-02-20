var https = require('https')
var packageInfo = require('../package.json')
var compareVersion = require('compare-version')
var Value = require('mutant/value')

module.exports = function () {
  var update = Value()
  update.sync = Value(false)
  var version = packageInfo.version
  https.get({
    host: 'api.github.com',
    path: '/repos/mmckegg/patchwork-next/releases/latest',
    headers: {
      'user-agent': `Patchwork v${version}`
    }
  }, function (res) {
    if (res.statusCode === 200) {
      var result = ''
      res.on('data', (x) => {
        result += x
      }).on('end', () => {
        var info = JSON.parse(result)
        if (compareVersion(info.tag_name.slice(1), version) > 0) {
          update.set(info.tag_name.slice(1))
        }
        update.sync.set(true)
      })
    }
  })
  return update
}
