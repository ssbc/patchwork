const pull = require('pull-stream')
const Path = require('path')
const nest = require('depnest')
const SqlView = require('ssb-flumeview-sql')
const { ssbSecretKeyToPrivateBoxSecret } = require('ssb-keys')
const { Value } = require('mutant')

exports.needs = nest({
  'sbot.obs.latestSequence': 'first',
  'config.sync.load': 'first',
  'keys.sync.load': 'first'
})

exports.gives = nest({
  'sqldb.sync.sqldb': true,
  'sqldb.obs.since': true,
  'sqldb.sync.cursorQuery': true
})

exports.create = function (api) {
  // TODO: resolving config, keys, logpath and secret only works by chance. Depject _happens_ to have resolved those deps by now but it's a bit naughty.
  const config = api.config.sync.load()
  const keys = api.keys.sync.load()
  const logPath = Path.join(config.path, 'flume', 'log.offset')
  const secret = ssbSecretKeyToPrivateBoxSecret(keys)
  const since = Value()

  const sqlView = SqlView(logPath, '/tmp/patchwork.sqlite3', secret, keys.id)

  // We store sqlViewLatest here to avoid polling the db every idle callback.
  // This setup assumes this is the only place that will call sqlView.process.
  // If something else calls process then sqlViewLatest will no longer reflect the state of the db.
  let sqlViewLatest = sqlView.getLatest()
  since.set(sqlViewLatest)

  window.requestIdleCallback(function processMore (deadline) {
    window.requestIdleCallback(processMore)

    const sbotLatest = api.sbot.obs.latestSequence()()

    if (sqlViewLatest === sbotLatest) return

    while (deadline.timeRemaining() > 0) {
      sqlView.process({ chunkSize: 250 })
    }

    sqlViewLatest = sqlView.getLatest()

    window.requestAnimationFrame(function () {
      var sqlViewLatest = sqlView.getLatest()
      if (since() !== sqlViewLatest) {
        since.set(sqlViewLatest)
      }
    })

    console.log(`sqlView progress: ${sqlViewLatest / sbotLatest}`)
  })

  return nest({
    'sqldb.sync.sqldb': function () {
      return {
        // Don't export process function. See comments above.
        knex: sqlView.knex,
        getLatest: sqlView.getLatest,
        strings: sqlView.strings,
        modifiers: sqlView.modifiers
      }
    },
    'sqldb.obs.since': function () {
      return since
    },
    'sqldb.sync.cursorQuery': function cursorQuery (nextQuery, opts) {
      opts = opts || {}
      opts.limit = opts.limit || 40
      opts.lastSeq = Number.POSITIVE_INFINITY

      return function () {
        return pull(
          pull.infinite(() => opts), // change this to pullDefer
          pull.asyncMap(function (opts, cb) {
            nextQuery(opts, function (err, results) {
              if (err) return cb(err)
              if (!results.length) return cb(true)
              var length = results.length
              opts.lastSeq = results[length - 1].flumeSeq
              cb(err, results)
            })
          }),
          pull.flatten()
        )
      }
    }
  })
}
