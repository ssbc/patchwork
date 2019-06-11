var ref = require('ssb-ref')
var nest = require('depnest')

exports.gives = nest('message.sync.root', true)

exports.create = function (api) {
  return nest('message.sync.root', function (msg) {
    if (msg && msg.value && msg.value.content) {
      var type = msg.value.content.type
      var root = msg.value.content.root

      if (type === 'vote') {
        root = msg.value.content.vote && msg.value.content.vote.link
      } else if (type === 'about') {
        root = msg.value.content.about
      }

      // only abouts and likes for messages (not feeds) will be returned
      if (ref.isMsg(root)) return root
    }
  })
}
