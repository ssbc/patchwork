const h = require('mutant/h')
const nest = require('depnest')

exports.needs = nest({
  'message.html': {
    backlinks: 'first',
    author: 'first',
    meta: 'map',
    timestamp: 'first'
  },
  'profile.html.person': 'first',
  'intl.sync.format': 'first'
})

exports.gives = nest('message.html.layout')

exports.create = (api) => {
  var format = api.intl.sync.format;
  return nest('message.html.layout', mini)

  function mini (msg, opts) {
    var classList = []
    var additionalMeta = []
    if (opts.priority >= 2) {
      classList.push('-new')
      additionalMeta.push(h('span.flag -new', {title: format('newMessage')}))
    }
    if (opts.layout !== 'mini') return
    return h('Message -mini', {classList}, [
      h('header', [
        h('div.mini', [
          api.profile.html.person(msg.value.author), ' ',
          opts.content
        ]),
        h('div.meta', {}, [
          api.message.html.timestamp(msg),
          additionalMeta
        ])
      ])
    ])
  }
}
