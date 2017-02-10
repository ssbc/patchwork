var Value = require('mutant/value')
var computed = require('mutant/computed')

exports.needs = {
  about: {
    signifier: 'first'
  }
}

exports.gives = {
  people_names: true
}

exports.create = function (api) {
  return {
    people_names (ids) {
      return computed(Array.from(ids).map(ObservName), join) || ''
    }
  }

  // scoped

  function ObservName (id) {
    var obs = Value(id.slice(0, 10))
    api.about.signifier(id, (_, value) => {
      if (value && value.length) {
        obs.set(value[0].name)
      }
    })
    return obs
  }
}

function join (...args) {
  return args.join('\n')
}
