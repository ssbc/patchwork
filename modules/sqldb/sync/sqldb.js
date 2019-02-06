const Path = require('path')
const nest = require('depnest')
const SqlView = require('ssb-flumeview-sql')
const { ssbSecretKeyToPrivateBoxSecret } = require('ssb-keys')

exports.needs = nest({
  'sbot.obs.latestSequence': 'first',
  'config.sync.load': 'first',
  'keys.sync.load': 'first'
})

exports.gives = nest(
  'sqldb.sync.sqldb'
)

exports.create = function (api) {
  const config = api.config.sync.load()
  const keys = api.keys.sync.load()
  const logPath = Path.join(config.path, 'flume', 'log.offset')
  const secret = ssbSecretKeyToPrivateBoxSecret(keys)

  const sqlView = SqlView(logPath, '/tmp/patchwork.sqlite3', secret, keys.id)

  // We store sqlViewLatest here to avoid polling the db every idle callback.
  // This setup assumes this is the only place that will call sqlView.process.
  // If something else calls process then sqlViewLatest will no longer reflect the state of the db.
  let sqlViewLatest = sqlView.getLatest()

  window.requestIdleCallback(function processMore (deadline) {
    window.requestIdleCallback(processMore)

    const sbotLatest = api.sbot.obs.latestSequence()()

    if (sqlViewLatest === sbotLatest) return

    while (deadline.timeRemaining() > 0) {
      sqlView.process({ chunkSize: 250 })
    }

    sqlViewLatest = sqlView.getLatest()
    console.log(`sqlView progress: ${sqlViewLatest / sbotLatest}`)
  })

  return nest('sqldb.sync.sqldb', function () {
    return {
      // Don't export process function. See comments above.
      knex: sqlView.knex,
      getLatest: sqlView.getLatest,
      strings: sqlView.strings,
      modifiers: sqlView.modifiers
    }
  })
}
