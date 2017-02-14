var nest = require('depnest')
var computed = require('mutant/computed')

exports.needs = nest({
  'about.obs.name': 'first'
})

exports.gives = nest({
  'profile.obs': [ 'names' ]
})

exports.create = function (api) {
  return nest({
    'profile.obs': { names }
  })

  function names (ids) {
    return computed(Array.from(ids).map(api.about.obs.name), join) || ''
  }
}

function join (...args) {
  return args.join('\n')
}
