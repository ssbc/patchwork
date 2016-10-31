var Value = require('@mmckegg/mutant/value')
var plugs = require('patchbay/plugs')
var signifier = plugs.first(exports.signifier = [])
var computed = require('@mmckegg/mutant/computed')

exports.people_names = function (ids) {
  return computed(Array.from(ids).map(ObservName), join) || ''
}

function join (...args) {
  return args.join('\n')
}

function ObservName (id) {
  var obs = Value(id.slice(0, 10))
  signifier(id, (_, value) => {
    if (value && value.length) {
      obs.set(value[0].name)
    }
  })
  return obs
}
