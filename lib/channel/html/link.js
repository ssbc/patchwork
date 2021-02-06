const h = require('mutant/h')
const normalizeChannel = require('ssb-ref').normalizeChannel

module.exports = function (channel, text = null) {
  const ref = `#${normalizeChannel(channel)}`
  return h('a ChannelLink', { href: ref, title: ref }, text || ref)
}
