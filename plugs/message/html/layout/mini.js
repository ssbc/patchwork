const {h, computed} = require('mutant')
const nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'message.html': {
    action: 'map',
    backlinks: 'first',
    author: 'first',
    meta: 'map',
    timestamp: 'first'
  },
  'profile.html.person': 'first'
})

exports.gives = nest('message.html.layout')

exports.create = (api) => {
  return nest('message.html.layout', mini)

  function mini (msg, opts) {
    if (opts.layout !== 'mini') return

    var classList = []
    var additionalMeta = []
    var footer = []

    if (opts.showActions) {
      // HACK: this is used for about messages, which really should have there own layout
      footer.push(
        computed(msg.key, (key) => {
          if (ref.isMsg(key)) {
            return h('footer', [
              h('div.actions', [
                api.message.html.action(msg)
              ])
            ])
          }
        })
      )
    }

    if (opts.priority >= 2) {
      classList.push('-new')
      additionalMeta.push(h('span.flag -new', {title: 'New Message'}))
    }
    return h('Message -mini', {classList}, [
      h('header', [
        h('div.mini', [
          api.profile.html.person(msg.value.author), ' ',
          opts.content
        ]),
        h('div.meta', {}, [
          api.message.html.meta(msg),
          api.message.html.timestamp(msg),
          additionalMeta
        ])
      ]),
      footer
    ])
  }
}
