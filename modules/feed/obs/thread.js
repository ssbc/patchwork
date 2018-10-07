var nest = require('depnest')
var sort = require('ssb-sort')
var ref = require('ssb-ref')
var isBlog = require('scuttle-blog/isBlog')
var Blog = require('scuttle-blog')

var { Array: MutantArray, Value, map, computed, concat, ProxyCollection } = require('mutant')

exports.needs = nest({
  'backlinks.obs.for': 'first',
  'sbot.async.get': 'first',
  'message.sync.unbox': 'first',
  'message.sync.root': 'first',
  'message.sync.isBlocked': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('feed.obs.thread')

exports.create = function (api) {
  return nest('feed.obs.thread', thread)

  function thread (rootId, { branch } = {}) {
    if (!ref.isLink(rootId)) throw new Error('an id must be specified')
    var sync = Value(false)
    var { isBlocked, root } = api.message.sync
    var replies = ProxyCollection()

    var prepend = MutantArray()
    api.sbot.async.get(rootId, (err, value) => {
      var rootMessage = null
      if (!err) {
        rootMessage = unboxIfNeeded({ key: rootId, value })
        if (isBlocked(rootMessage)) rootMessage.isBlocked = true

        if (isBlog(rootMessage)) {
          // resolve the blog body before returning
          Blog(api.sbot.obs.connection).async.get(rootMessage, (err, result) => {
            if (!err) {
              rootMessage.body = result.body
              prepend.push(Value(rootMessage))
              sync.set(true)
            }
          })
        } else {
          sync.set(true)
          prepend.push(Value(rootMessage))
        }
      } else {
        sync.set(true)
      }

      // calcaulate after message has been resolved so that we can check if thread author blocks the reply
      // wrap computed in a map to turn into individual observables
      replies.set(map(computed(backlinks, (msgs) => {
        return sort(msgs.filter(msg => {
          const { type, branch } = msg.value.content
          return type !== 'vote' && !isBlocked(msg, rootMessage) && (root(msg) === rootId || matchAny(branch, rootId))
        }))
      }), x => Value(x), {
        // avoid refresh of entire list when items added
        comparer: (a, b) => a === b
      }))
    })

    var backlinks = api.backlinks.obs.for(rootId)

    // append the root message to the sorted replies list
    // -------------------------
    // concat preserves the individual observable messages so that clients don't need to
    // rerender the entire list when an item is added (map will only be called for new items)
    // (we can't use a computed here as it would squash the individual observables into a single one)
    var messages = concat([prepend, replies])

    var result = {
      messages,
      lastId: computed(messages, (messages) => {
        var branches = sort.heads(messages)
        if (branches.length <= 1) {
          branches = branches[0]
        }
        return branches
      }),
      rootId: computed(messages, (messages) => {
        if (branch && messages.length) {
          return messages[0].value.content.root
        } else {
          return rootId
        }
      }),
      branchId: computed(messages, (messages) => {
        if (branch) return rootId
      }),
      previousKey: function (msg) {
        return PreviousKey(result.messages, msg)
      },
      isPrivate: computed(messages, msgs => {
        if (!msgs[0]) return false

        return msgs[0].value.private || false
      }),
      channel: computed(messages, msgs => {
        if (!msgs[0]) return undefined

        return msgs[0].value.content.channel
      }),
      recps: computed(messages, msgs => {
        if (!msgs[0]) return undefined

        return msgs[0].value.content.recps
      })
    }

    result.sync = computed([backlinks.sync, sync], (a, b) => a && b, { idle: true })
    return result
  }

  function unboxIfNeeded (msg) {
    if (msg.value && typeof msg.value.content === 'string') {
      return api.message.sync.unbox(msg) || msg
    } else {
      return msg
    }
  }
}

function PreviousKey (collection, item) {
  return computed(collection, (c) => {
    var index = collection.indexOf(item)
    if (~index) {
      var previous = c[index - 1]
      if (previous) {
        return previous.key
      }
    }
  })
}

function matchAny (valueOrArray, compare) {
  if (valueOrArray === compare) {
    return true
  } else if (Array.isArray(valueOrArray)) {
    return valueOrArray.includes(compare)
  }
}
