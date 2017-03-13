var ssbKeys = require('ssb-keys')
var explain = require('explain-error')
var valid = require('scuttlebot/lib/validators')
var Links = require('streamview-links')
var pull = require('pull-stream')
var Notify = require('pull-notify')
var path = require('path')
var Value = require('mutant/value')
var watchThrottle = require('mutant/watch-throttle')

var indexes = [
  { key: 'TSP', value: ['timestamp'] },
  { key: 'ATY', value: [['value', 'author'], ['value', 'content', 'type'], 'timestamp'] }
]

module.exports = {
  name: 'private',
  version: '0.0.0',
  manifest: {
    publish: 'async', unbox: 'sync', read: 'source', progress: 'source'
  },
  permissions: {
    anonymous: {}
  },
  init: function (sbot, config) {
    var dir = path.join(config.path, 'private')
    var version = 0

    var index = Links(dir, indexes, (x, emit) => {
      var value = unbox(x)
      if (value) {
        emit(value)
      }
    }, version)

    var notify = Notify()
    var pending = Value(0)

    watchThrottle(pending, 200, (value) => {
      notify({pending: Math.max(0, value)})
    })

    index.init(function (_, since) {
      countChanges(since, function (err, changes) {
        if (err) throw err
        pending.set(changes)
        onChange(() => {
          pending.set(pending() + 1)
        })
        pull(
          sbot.createLogStream({gt: since || 0, live: true, sync: false}),
          pull.through(function () {
            pending.set(pending() - 1)
          }),
          index.write(function (err) {
            if (err) throw err
          })
        )
      })
    })

    return {
      publish: valid.async(function (data, recps, cb) {
        var ciphertext
        try { ciphertext = ssbKeys.box(data, recps) }
        catch (e) { return cb(explain(e, 'failed to encrypt')) }
        sbot.publish(ciphertext, cb)
      }, 'string|object', 'array'),
      unbox: valid.sync(function (ciphertext) {
        var data
        try { data = ssbKeys.unbox(ciphertext, sbot.keys.private) }
        catch (e) { throw explain(e, 'failed to decrypt') }
        return data
      }, 'string'),
      read: function (opts) {
        if (opts && typeof opts === 'string') {
          try {
            opts = {query: JSON.parse(opts)}
          } catch (err) {
            return pull.error(err)
          }
        }
        return index.read(opts, function (ts, cb) {
          sbot.sublevel('log').get(ts, function (err, key) {
            if (err) return cb(explain(err, 'missing timestamp:'+ts))
            sbot.get(key, function (err, value) {
              if(err) return cb(explain(err, 'missing key:'+key))
              cb(null, {key: key, value: unboxValue(value), timestamp: ts})
            })
          })
        })
      },
      progress: notify.listen
    }

    function countChanges (since, cb) {
      var result = 0
      pull(
        sbot.createLogStream({gt: since || 0, keys: false, values: false}),
        pull.drain(function () {
          result += 1
        }, function (err) {
          cb(err, result)
        })
      )
    }

    function onChange (cb) {
      pull(
        sbot.createLogStream({keys: false, values: false, old: false}),
        pull.drain(function () {
          cb()
        })
      )
    }

    function unbox (msg) {
      if (typeof msg.value.content === 'string') {
        var value = unboxValue(msg.value)
        if (value) {
          return {
            key: msg.key, value: value, timestamp: msg.timestamp
          }
        }
      }
    }

    function unboxValue (value) {
      var plaintext = null
      try {
        plaintext = ssbKeys.unbox(value.content, sbot.keys.private)
      } catch (ex) {}
      if (!plaintext) return null
      return {
        previous: value.previous,
        author: value.author,
        sequence: value.sequence,
        timestamp: value.timestamp,
        hash: value.hash,
        content: plaintext,
        private: true
      }
    }
  }
}
