const ref = require('ssb-ref')
const nest = require('depnest')

exports.gives = nest('message.sync.root', true)

exports.create = function () {
  return nest('message.sync.root', function (msg) {
    if (msg && msg.value && msg.value.content) {
      const type = msg.value.content.type
      let root = msg.value.content.root

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
