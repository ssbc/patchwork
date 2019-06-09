var normalizeChannel = require('ssb-ref').normalizeChannel
var pull = require('pull-stream')

exports.manifest = {
  get: 'async'
}

exports.init = function (ssb, config) {
  var cbs = {}
  var caches = {}

  return {
    get: function ({ id }, cb) {
      if (caches[id]) {
        cb(null, caches[id])
      } else {
        // cache not loaded yet, queue
        if (!cbs[id]) {
          // first request, start loading
          cbs[id] = [cb]
          loadCache(id)
        } else {
          // subsequent request, add to queue
          cbs[id].push(cb)
        }
      }
    }
  }

  function update (msg, cache) {
    cache[normalizeChannel(msg.value.content.channel)] = {
      subscribed: msg.value.content.subscribed,
      timestamp: msg.value.timestamp
    }
  }

  function loadCache (id) {
    var subscriptions = {}
    pull(
      ssb.query.read({
        query: [{ $filter: {
          value: {
            author: id,
            content: {
              type: 'channel'
            }
          }
        } }, { $map: true }],
        old: true,
        live: true
      }),
      pull.drain(msg => {
        if (msg.sync) {
          caches[id] = subscriptions
          let callbacks = cbs[id] || []
          cbs[id] = null
          callbacks.forEach(cb => {
            cb(null, caches[id])
          })
        } else {
          update(msg, subscriptions)
        }
      }, (err) => {
        let callbacks = cbs[id] || []
        cbs[id] = null
        callbacks.forEach(cb => {
          cb(err)
        })
      })
    )
  }
}
