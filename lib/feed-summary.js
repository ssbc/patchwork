var pull = require('pull-stream')
var pullPushable = require('pull-pushable')
var pullNext = require('pull-next')
var SortedArray = require('sorted-array-functions')

module.exports = FeedSummary

function FeedSummary (source, windowSize, cb) {
  var last = null
  var returned = false
  var done = false
  return pullNext(() => {
    if (!done) {
      var next = {reverse: true, limit: windowSize, live: false}
      if (last) {
        next.lt = last.timestamp || last.value.sequence
      }
      var pushable = pullPushable()
      pull(
        source(next),
        pull.collect((err, values) => {
          if (err) throw err
          if (!values.length) {
            done = true
          } else {
            groupMessages(values).forEach(v => pushable.push(v))
            last = values[values.length - 1]
          }
          pushable.end()
          if (!returned) cb && cb()
          returned = true
        })
      )
    }
    return pushable
  })
}

function groupMessages (messages) {
  var follows = {}
  var messageUpdates = {}
  reverseForEach(messages, function (msg) {
    if (!msg.value) return
    var c = msg.value.content
    if (c.type === 'contact') {
      updateContact(msg, follows)
    } else if (c.type === 'vote') {
      if (c.vote && c.vote.link) {
        // only show digs of posts added in the current window
        // and only for the main post
        const group = messageUpdates[c.vote.link]
        if (group) {
          if (c.vote.value > 0) {
            group.lastUpdateType = 'dig'
            group.digs.add(msg.value.author)
            group.updated = msg.timestamp
          } else {
            group.digs.delete(msg.value.author)
            if (group.lastUpdateType === 'dig' && !group.digs.size && !group.replies.length) {
              group.lastUpdateType = 'reply'
            }
          }
        }
      }
    } else {
      if (c.root) {
        const group = ensureMessage(c.root, messageUpdates)
        group.lastUpdateType = 'reply'
        group.repliesFrom.add(msg.value.author)
        group.replies.push(msg)
        group.updated = msg.timestamp
      } else {
        const group = ensureMessage(msg.key, messageUpdates)
        group.lastUpdateType = 'post'
        group.updated = msg.timestamp
        group.message = msg
      }
    }
  })

  var result = []
  Object.keys(follows).forEach((key) => {
    SortedArray.add(result, follows[key], compareUpdated)
  })
  Object.keys(messageUpdates).forEach((key) => {
    SortedArray.add(result, messageUpdates[key], compareUpdated)
  })
  return result
}

function compareUpdated (a, b) {
  return b.updated - a.updated
}

function reverseForEach (items, fn) {
  var i = items.length - 1
  var start = Date.now()
  nextBatch()

  function nextBatch () {
    while (i >= 0 && Date.now() - start < 10) {
      fn(items[i], i)
      i -= 1
    }

    if (i > 0) {
      setImmediate(nextBatch)
    }
  }
}

function updateContact (msg, groups) {
  var c = msg.value.content
  var id = msg.value.author
  var group = groups[id]
  if (c.contact) {
    if (c.following) {
      if (!group) {
        group = groups[id] = {
          type: 'follow',
          lastUpdateType: null,
          contacts: new Set(),
          updated: 0,
          id: id
        }
      }
      group.contacts.add(c.contact)
      group.updated = msg.timestamp
    } else {
      if (group) {
        group.contacts.delete(c.contact)
        if (!group.contacts.size) {
          delete groups[id]
        }
      }
    }
  }
}

function ensureMessage (id, groups) {
  var group = groups[id]
  if (!group) {
    group = groups[id] = {
      type: 'message',
      repliesFrom: new Set(),
      replies: [],
      message: null,
      messageId: id,
      digs: new Set(),
      updated: 0
    }
  }
  return group
}
