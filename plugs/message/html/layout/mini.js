const h = require('mutant/h')
const nest = require('depnest')

exports.needs = nest({
  'message.html': {
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
    return h('div', {
      classList: 'Message -mini'
    }, [
      h('header', [
        h('div.mini', [
          api.profile.html.person(msg.value.author), ' ',
          opts.content
        ]),
        h('div.meta', {}, api.message.html.timestamp(msg))
      ])
    ])
  }
}
