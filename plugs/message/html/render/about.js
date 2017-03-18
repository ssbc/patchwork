var h = require('mutant/h')
var computed = require('mutant/computed')
var nest = require('depnest')
var extend = require('xtend')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first',
    markdown: 'first'
  },
  'keys.sync.id': 'first',
  'about.html.link': 'first',
  'about.obs.name': 'first',
  'blob.sync.url': 'first'

})

exports.gives = nest('message.html.render')

exports.create = function (api) {
  return nest('message.html.render', function about (msg, opts) {
    if (msg.value.content.type !== 'about') return
    if (!msg.value.content.about) return

    var c = msg.value.content
    var self = msg.value.author === c.about
    var content = []

    if (c.name) {
      var target = api.about.html.link(c.about, c.name)
      content.push(computed([self, api.about.obs.name(c.about), c.name], (self, a, b) => {
        if (self) {
          return ['self identifies as ', target]
        } else if (a === b) {
          return ['identified ', api.about.html.link(c.about)]
        } else {
          return ['identifies ', api.about.html.link(c.about), ' as ', target]
        }
      }))
    }

    if (c.image) {
      if (!content.length) {
        var imageAction = self ? 'self assigned a display image' : ['assigned a display image to ', api.about.html.link(c.about)]
        content.push(imageAction)
      }

      content.push(h('a AboutImage', {
        href: c.about
      }, [
        h('img', {src: api.blob.sync.url(c.image)})
      ]))
    }

    var elements = []

    if (content.length) {
      var element = api.message.html.layout(msg, extend({
        content, layout: 'mini'
      }, opts))
      elements.push(api.message.html.decorate(element, { msg }))
    }

    if (c.description) {
      elements.push(api.message.html.decorate(api.message.html.layout(msg, extend({
        content: [
          self ? 'self assigned a description' : ['assigned a description to ', api.about.html.link(c.about)],
          api.message.html.markdown(c.description)
        ],
        layout: 'mini'
      }, opts)), { msg }))
    }

    return elements
  })
}
