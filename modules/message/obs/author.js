var Value = require('mutant/value')
var ref = require('ssb-ref')
var nest = require('depnest')

exports.needs = nest('sbot.async.get', 'first')

exports.gives = nest('message.obs.author')

exports.create = function (api) {
  return nest('message.obs.author', function (id) {
    if (!ref.isLink(id)) throw new Error('an id must be specified')
    var result = Value()

    if (ref.isMsg(id)) {
      api.sbot.async.get(id, function (err, value) {
        if (err) console.error(err)
        else result.set(value.author)
      })
    }

    return result
  })
}
