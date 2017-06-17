var h = require('mutant/h')
var nest = require('depnest')
var extend = require('xtend')
var ref = require('ssb-ref')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first'
  },
  'about.obs.latestValue': 'first'
})

exports.gives = nest('message.html.render')

exports.create = function (api) {
  return nest('message.html.render', function about (msg, opts) {
    if (msg.value.content.type !== 'about') return
    if (!ref.isMsg(msg.value.content.about)) return
    if (!msg.value.content.attendee) return
    if (msg.value.content.attendee.link !== msg.value.author) return

    var action = msg.value.content.attendee.remove ? `can't attend` : 'is attending'
    var target = msg.value.content.about
    var title = api.about.obs.latestValue(target, 'title')
    var element = api.message.html.layout(msg, extend({
      showActions: true,
      miniContent: [action, ' ', h('a', {href: target}, title)],
      layout: 'mini'
    }, opts))

    return api.message.html.decorate(element, { msg })
  })
}
