var h = require('mutant/h')
var nest = require('depnest')
var extend = require('xtend')
var appRoot = require('app-root-path');
var i18n = require(appRoot + '/lib/i18n').i18n

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first'
  }
})

exports.gives = nest('message.html.render')

exports.create = function (api) {
  return nest('message.html.render', function renderMessage (msg, opts) {
    if (msg.value.content.type !== 'channel') return
    var element = api.message.html.layout(msg, extend({
      miniContent: messageContent(msg),
      layout: 'mini'
    }, opts))

    return api.message.html.decorate(element, { msg })
  })

  function messageContent (msg) {
    var channel = `#${msg.value.content.channel}`
    var subscribed = msg.value.content.subscribed
    return [
      subscribed ? i18n.__('subscribed to ') : i18n.__('unsubscribed from '),
      h('a', {href: channel}, channel)
    ]
  }
}
