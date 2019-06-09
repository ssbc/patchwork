var ref = require('ssb-ref')

module.exports = function getRoot (msg) {
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
}
