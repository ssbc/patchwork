const h = require('mutant/h')
const nest = require('depnest')
const normalizeChannel = require('ssb-ref').normalizeChannel

exports.gives = nest('channel.html.link')

exports.create = function (api) {
  return nest('channel.html.link', function (channel, text = null) {
    const ref = `#${normalizeChannel(channel)}`
    return h('a ChannelLink', { href: ref, title: ref }, text || ref)
  })
}
