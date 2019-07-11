const pull = require('pull-stream')
const PullPushAbort = require('../pull-push-abort')
const FlumeReduce = require('flumeview-reduce')

const ref = require('ssb-ref')

exports.manifest = {
  replicateStream: 'source',
  stateStream: 'source',
  ignoreStream: 'source',
  isFollowing: 'async',
  isBlocking: 'async'
}

exports.init = function (ssb, config) {
  var values = {}

  var view = ssb._flumeUse('patchwork-contacts', FlumeReduce(0, function reduce (result, item) {
    // used by the reducer view
    if (!result) result = {}
    if (item) {
      for (const author in item) {
        for (const contact in item[author]) {
          if (!result[author]) result[author] = {}
          result[author][contact] = item[author][contact]
        }
      }
    }

    // always make sure values is the latest result
    // hack around result being null on index initialize
    values = result
    return result
  }, function map (msg) {
    // used by the reducer view
    if (msg.value && msg.value.content && msg.value.content.type === 'contact' && ref.isFeed(msg.value.content.contact)) {
      return {
        [msg.value.author]: {
          [msg.value.content.contact]: getContactState(msg.value.content)
        }
      }
    }
  }))

  view.get((err, result) => {
    if (!err && result) {
      // initialize values
      values = result
    }
  })

  return {
    // expose raw view to other plugins (not over rpc)
    raw: view,

    isFollowing: function ({ source, dest }, cb) {
      if (values && values[source]) {
        cb(null, values[source][dest] === true)
      } else {
        view.get((err, graph) => {
          if (err) return cb(err)
          var following = graph && graph[source] && graph[source][dest] === true
          cb(null, following)
        })
      }
    },

    isBlocking: function ({ source, dest }, cb) {
      if (values && values[source]) {
        cb(null, values[source][dest] === false)
      } else {
        view.get((err, graph) => {
          if (err) return cb(err)
          var blocking = graph && graph[source] && graph[source][dest] === false
          cb(null, blocking)
        })
      }
    },

    /// return a list of everyone you have blocked privately
    ignoreStream: function ({ live }, cb) {
      var stream = PullPushAbort()

      var result = {}
      var sync = null

      pull(
        ssb.query.read({
          query: [{ $filter: {
            value: {
              author: ssb.id,
              content: {
                type: 'contact'
              }
            }
          } }],
          private: true,
          live
        }),
        stream.aborter,
        pull.drain((msg) => {
          if (msg.sync) {
            sync = true
            if (live) {
              stream.push(result)
            }
            return
          }

          var isPrivate = msg.value && msg.value.meta && msg.value.meta.private
          var content = msg.value.content

          // if a non-private state has been set since last private, revert to null
          // patchwork will always try to set a new ignore status after the public if it differs
          // this is just to handle the case where the private state was set by another client
          // (which will override ignore due to the way ssb-friends handles private blocks)

          var value = isPrivate ? !!content.blocking : null

          if (sync) {
            stream.push({ [content.contact]: value })
          } else {
            result[content.contact] = value
          }
        }, (err) => {
          if (err) return stream.end(err)
          if (stream.ended || sync) return

          if (!live) {
            stream.push(result)
          }

          stream.end()
        })
      )

      return stream
    },

    // return who a given contact publicly follows and blocks (or reverse)
    stateStream: function ({ feedId, live = false, reverse = false }, cb) {
      var stream = PullPushAbort()

      var result = {}
      var sync = null

      // stream reverse states if option specified
      var queryStream = reverse ? ssb.backlinks.read({
        query: [{ $filter: {
          dest: feedId,
          value: {
            content: {
              type: 'contact',
              contact: feedId
            }
          }
        } }],
        live
      }) : ssb.query.read({
        query: [{ $filter: {
          value: {
            author: feedId,
            content: {
              type: 'contact'
            }
          }
        } }],
        live
      })

      pull(
        queryStream,
        stream.aborter,
        pull.filter(msg => (msg.value && msg.value.content && msg.value.content.type) || msg.sync),
        pull.drain((msg) => {
          if (msg.sync) {
            // send first reduced result when running in live mode
            sync = true
            if (live) stream.push(result)
            return
          }

          var isPrivate = msg.value && msg.value.meta && msg.value.meta.private && msg.value.author === ssb.id

          if (!isPrivate) {
            var content = msg.value.content
            var contact = reverse ? msg.value.author : content.contact
            var value = getContactState(msg.value.content)

            if (sync) {
              // send updated state in live mode
              stream.push({ [contact]: value })
            } else {
              result[contact] = value
            }
          }
        }, (err) => {
          if (err) return stream.end(err)
          if (stream.ended || sync) return

          // send final result when not live
          if (!live) stream.push(result)
          stream.end()
        })
      )

      return stream
    },

    // get the reduced follows list starting at yourId (who to replicate, block)
    replicateStream: function ({ throttle = 5000, live }) {
      var stream = PullPushAbort()

      var lastResolvedValues = {}

      var timer = null
      var queued = false
      var sync = false

      var update = () => {
        // clear queue
        clearTimeout(timer)
        queued = false

        // get latest replication state (merge together values)
        var resolvedValues = resolveValues(values, ssb.id)

        // push changes since last update
        stream.push(objectDiff(lastResolvedValues, resolvedValues))

        // update internal de-dupe list
        lastResolvedValues = resolvedValues
      }

      pull(
        view.stream({ live }),
        stream.aborter,
        pull.drain((msg) => {
          if (stream.ended) return

          if (!sync) {
            // we'll store the incoming values (they will be updated as the view updates so
            // do not need to be manually patched)
            sync = true
            update()

            // if not live, we can close stream
            if (!live) stream.end()
          } else if (msg) {
            if (!queued) {
              queued = true
              timer = setTimeout(update, throttle)
            }
          }
        }, (err) => {
          if (err) return stream.end(err)
        })
      )

      return stream
    }
  }
}

function getContactState (content) {
  return content.blocking
    ? false
    : content.following
      ? true
      : null
}

function objectDiff (original, changed) {
  var result = {}
  var keys = new Set([...Object.keys(original), ...Object.keys(changed)])
  keys.forEach(key => {
    if (original[key] !== changed[key]) {
      result[key] = changed[key]
    }
  })
  return result
}

function resolveValues (values, yourId) {
  var result = {}
  if (values[yourId]) {
    for (const id in values[yourId]) {
      if (values[yourId][id] === true) {
        for (const contact in values[id]) {
          // only apply block if someone doesn't already follow
          if (values[id][contact] != null && result[contact] !== true) {
            result[contact] = values[id][contact]
          }
        }
      }
    }

    // override with your own blocks/follows
    for (const contact in values[yourId]) {
      if (values[yourId][contact] != null) {
        result[contact] = values[yourId][contact]
      }
    }
  }
  return result
}
