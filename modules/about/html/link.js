var h = require('mutant/h')
var nest = require('depnest')

exports.needs = nest({
  'about.obs.name': 'first'
})

exports.gives = nest('about.html.link')

exports.create = function (api) {
  return nest('about.html.link', function (id, text = null) {
    return h('a', {href: id, title: id}, text || ['@', api.about.obs.name(id)])
  })
}
