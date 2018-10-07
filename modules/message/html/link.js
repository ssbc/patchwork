var h = require('mutant/h')
var ref = require('ssb-ref')
var nest = require('depnest')

exports.needs = nest('message.async.name', 'first')

exports.gives = nest('message.html.link')

exports.create = function (api) {
  return nest('message.html.link', function (id) {
    if (typeof id !== 'string') { throw new Error('link must be to message id') }

    var link = h('a', { href: id }, id.substring(0, 10) + '...')

    if (ref.isMsg(id)) {
      api.message.async.name(id, function (err, name) {
        if (err) console.error(err)
        else link.textContent = name
      })
    }

    return link
  })
}
