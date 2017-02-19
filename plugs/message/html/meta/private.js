const h = require('mutant/h')
const map = require('mutant/map')
const nest = require('depnest')
var msgs = require('ssb-msgs')

exports.needs = nest({
  'about.html.image': 'first',
  'about.obs.name': 'first'
})
exports.gives = nest('message.html.meta')

exports.create = (api) => {
  return nest('message.html.meta', function privateMeta (msg) {
    if (msg.value.private) {
      return h('span.private', map(msg.value.content.recps, id => {
        id = msgs.link(id, 'feed').link
        return h('a', {
          href: id,
          title: api.about.obs.name(id)
        }, [
          api.about.html.image(id)
        ])
      }))
    }
  })
}
