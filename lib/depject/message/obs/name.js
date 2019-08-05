const Value = require('mutant/value')
const ref = require('ssb-ref')
const nest = require('depnest')

exports.needs = nest('message.async.name', 'first')

exports.gives = nest('message.obs.name')

exports.create = function (api) {
  return nest('message.obs.name', function (id) {
    if (!ref.isLink(id)) throw new Error('an id must be specified')
    const value = Value(id.substring(0, 10) + '...')

    if (ref.isMsg(id)) {
      api.message.async.name(id, function (err, name) {
        if (err) console.error(err)
        else value.set(name)
      })
    }

    return value
  })
}
