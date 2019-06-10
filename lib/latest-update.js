var https = require('https')
var packageInfo = require('../package.json')
var compareVersion = require('compare-version')
var Value = require('mutant/value')
var computed = require('mutant/computed')

module.exports = function () {
  var update = Value()
  var hidden = Value(false)
  update.sync = Value(false)
  var version = packageInfo.version
  const checkForUpdate = () => {
    // Check whether notification has been hidden.
    if (hidden() === false)  {
      // If so, stop the interval timer.
      updateCheck()
      // And `return` to quit this function.
      return
    }

    https.get({
      host: 'api.github.com',
      path: '/repos/ssbc/patchwork/releases/latest',
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
      // You must handle the error here otherwise you get an unhandled error exception which stops the whole app.
    }).on('error', function (error) {
      console.log('error trying to reach github to check for latest patchwork version: ', error)
    })
  }

  // Check for update immediately.
  checkForUpdate()

  // Retry update check every 24 hours.
  const millisecondsPerDay = 1000 * 60 * 60 * 24

  // Previously we only checked for updates on startup, but some people keep
  // Patchwork running in the background all the time and they should get
  // update notifications too.
  const updateCheck = setInterval(checkForUpdate, millisecondsPerDay)

  var obs = computed([update, hidden], (update, hidden) => update && !hidden ? update : false)
  obs.ignore = () => hidden.set(true)
  return obs
}
