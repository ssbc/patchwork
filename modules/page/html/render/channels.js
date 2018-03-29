var nest = require('depnest')
var { h, when, computed, map } = require('mutant')

exports.needs = nest({
  'message.async.publish': 'first',
  'keys.sync.id': 'first',
  'channel.obs': {
    subscribed: 'first',
    recent: 'first'
  },
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function page (path) {
    if (path !== '/channels') return

    var id = api.keys.sync.id()
    var channels = api.channel.obs.recent()
    var subscribedChannels = api.channel.obs.subscribed(id)
    var loading = computed(subscribedChannels.sync, x => !x)

    return h('div', { classList: 'Scroller' }, [
      when(loading, [ h('Loading') ]),
      h('div', {
        classList: 'AllChannels',
        hidden: loading
      }, [
        map(channels, (channel) => {
          var subscribed = subscribedChannels.has(channel)
          return h('a.channel', {
            href: `#${channel}`,
            classList: [
              when(subscribed, '-subscribed')
            ]
          }, [
            h('span.name', '#' + channel)
          ])
        }, {maxTime: 5, idle: true})
      ])
    ])
  })
}
