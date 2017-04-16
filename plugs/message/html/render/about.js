var h = require('mutant/h')
var computed = require('mutant/computed')
var nest = require('depnest')
var extend = require('xtend')
var ref = require('ssb-ref')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first',
    markdown: 'first'
  },
  'keys.sync.id': 'first',
  'profile.html.person': 'first',
  'about.obs.name': 'first',
  'blob.sync.url': 'first'
})

exports.gives = nest('message.html.render')

exports.create = function (api) {
  return nest('message.html.render', function about (msg, opts) {
    if (msg.value.content.type !== 'about') return
    if (!ref.isFeed(msg.value.content.about)) return

    var c = msg.value.content
    var self = msg.value.author === c.about

    var miniContent = []
    var content = []

    if (c.name) {
      var target = api.profile.html.person(c.about, c.name)
      miniContent.push(computed([self, api.about.obs.name(c.about), c.name], (self, a, b) => {
        if (self) {
          return ['self identifies as "', target, '"']
        } else if (a === b) {
          return ['identified ', api.profile.html.person(c.about)]
        } else {
          return ['identifies ', api.profile.html.person(c.about), ' as "', target, '"']
        }
      }))
    }

    if (c.image) {
      if (!miniContent.length) {
        var imageAction = self ? 'self assigned a display image' : ['assigned a display image to ', api.profile.html.person(c.about)]
        miniContent.push(imageAction)
      }

      content.push(h('a AboutImage', {
        href: c.about
      }, [
        h('img', {src: api.blob.sync.url(c.image)})
      ]))
    }

    var elements = []

    if (miniContent.length) {
      var element = api.message.html.layout(msg, extend({
        showActions: true,
        miniContent,
        content,
        layout: 'mini'
      }, opts))
      elements.push(api.message.html.decorate(element, { msg }))
    }

    if (c.description) {
      elements.push(api.message.html.decorate(api.message.html.layout(msg, extend({
        showActions: true,
        miniContent: self ? 'self assigned a description' : ['assigned a description to ', api.profile.html.person(c.about)],
        content: api.message.html.markdown(c.description),
        layout: 'mini'
      }, opts)), { msg }))
    }

    return elements
  })
}
