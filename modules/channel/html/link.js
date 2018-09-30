var h = require('mutant/h')
var nest = require('depnest')

exports.needs = nest({
  'channel.sync.normalize': 'first'
})

exports.gives = nest('channel.html.link')

exports.create = function (api) {
  return nest('channel.html.link', function (channel, text = null) {
    var ref = `#${api.channel.sync.normalize(channel)}`
    return h('a ChannelLink', {href: ref, title: ref}, text || ref)
  })
}
