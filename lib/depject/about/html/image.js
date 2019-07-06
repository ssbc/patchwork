var h = require('mutant/h')
var nest = require('depnest')

exports.needs = nest({
  'about.obs.imageUrl': 'first',
  'about.obs.color': 'first'
})

exports.gives = nest('about.html.image')

exports.create = function (api) {
  return nest('about.html.image', function (id) {
    return h('img', {
      className: 'Avatar',
      style: { 'background-color': api.about.obs.color(id) },
      src: api.about.obs.imageUrl(id)
    })
  })
}
