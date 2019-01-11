var Path = require('path')
var nest = require('depnest')
var SqlView = require('ssb-flumeview-sql')

exports.needs = nest({
  'sbot.obs.latestSequence': 'first',
  'config.sync.load': 'first'
})

exports.gives = nest(
  'sqldb.sync.sqldb'
)

exports.create = function (api) {
  var config = api.config.sync.load()
  var keyPath = Path.join(config.path, 'flume', 'log.offset')

  var sqlView = SqlView(keyPath, '/tmp/patchwork.sqlite3', () => {})

  window.requestIdleCallback(function processMore (deadline) {
    var sbotLatest = api.sbot.obs.latestSequence()()
    var sqlViewLatest = sqlView.getLatest()

    window.requestIdleCallback(processMore)

    if (sqlViewLatest === sbotLatest) return

    while (deadline.timeRemaining() > 0) {
      sqlView.process({ chunkSize: 250 })
    }

    sqlViewLatest = sqlView.getLatest()
    console.log(`sqlView progress: ${sqlViewLatest / sbotLatest}`)
  })

  return nest('sqldb.sync.sqldb', function () {
    return sqlView
  })
}
