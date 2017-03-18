var nest = require('depnest')
var h = require('mutant/h')

exports.needs = nest({
  'about.obs.name': 'first'
})

exports.gives = nest({
  'profile.html': ['person']
})

exports.create = function (api) {
  return nest({
    'profile.html': {person}
  })

  function person (id) {
    return h('a ProfileLink', {href: id, title: id}, [
      api.about.obs.name(id)
    ])
  }
}
