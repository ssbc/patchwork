var pull = require('pull-stream')
var ref = require('ssb-ref')
var plugs = require('patchbay/plugs')
var message_compose = plugs.first(exports.message_compose = [])
var sbot_log = plugs.first(exports.sbot_log = [])
var feed_summary = plugs.first(exports.feed_summary = [])
var message_unbox = plugs.first(exports.message_unbox = [])
var get_id = plugs.first(exports.get_id = [])
var avatar_image_link = plugs.first(exports.avatar_image_link = [])

exports.screen_view = function (path, sbot) {
  if (path === '/private') {
    var id = get_id()

    return feed_summary((opts) => {
      return pull(
        sbot_log(opts),
        unbox()
      )
    }, [
      message_compose({type: 'post', recps: [], private: true}, {
        prepublish: function (msg) {
          msg.recps = [id].concat(msg.mentions).filter(function (e) {
            return ref.isFeed(typeof e === 'string' ? e : e.link)
          })
          if (!msg.recps.length) {
            throw new Error('cannot make private message without recipients - just mention the user in an at reply in the message you send')
          }
          return msg
        },
        placeholder: 'Write a private message'
      })
    ])
  }
}

exports.message_meta = function (msg) {
  if(msg.value.content.recps || msg.value.private) {
    return h('span.row', 'PRIVATE', map(msg.value.content.recps, function (id) {
      return avatar_image_link('string' == typeof id ? id : id.link, 'thumbnail')
    }))
  }
}

function unbox () {
  return pull(
    pull.filter(function (msg) {
      return typeof msg.value.content === 'string'
    }),
    pull.map(function (msg) {
      return message_unbox(msg)
    }),
    pull.filter(Boolean)
  )
}

function map (ary, iter) {
  if(Array.isArray(ary)) return ary.map(iter)
}
