const h = require('mutant/h')
const ref = require('ssb-ref')
const nest = require('depnest')

exports.needs = nest({
  'message.async.name': 'first',
  'sbot.async.get': 'first'
})

exports.gives = nest('message.html.link')

exports.create = function (api) {
  return nest('message.html.link', function (id, { inContext = false } = {}) {
    if (typeof id !== 'string') { throw new Error('link must be to message id') }

    const link = h('a', { href: id }, id.substring(0, 10) + '...')

    if (ref.isMsg(id)) {
      api.message.async.name(id, function (err, name) {
        if (err) console.error(err)
        else link.textContent = name
        if (inContext) {
          api.sbot.async.get({ id, private: true }, (err, value) => {
            if (err) return
            if (value && value.content && ref.isMsg(value.content.root)) {
              link.setAttribute('href', value.content.root)
              link.anchor = id
            }
          })
        }
      })
    }

    return link
  })
}
