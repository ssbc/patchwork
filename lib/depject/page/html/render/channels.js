const nest = require('depnest')
const { h, when, computed, map } = require('mutant')

exports.needs = nest({
  'keys.sync.id': 'first',
  'channel.obs': {
    subscribed: 'first',
    recent: 'first'
  }
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function page (path) {
    if (path !== '/channels') return

    const id = api.keys.sync.id()
    const channels = api.channel.obs.recent(150)
    const subscribedChannels = api.channel.obs.subscribed(id)
    const loading = computed(subscribedChannels.sync, x => !x)

    return h('div', { classList: 'Scroller' }, [
      when(loading, [h('Loading')]),
      h('div', {
        classList: 'AllChannels',
        hidden: loading
      }, [
        map(channels, (channel) => {
          const subscribed = subscribedChannels.has(channel)
          return h('a.channel', {
            href: `#${channel}`,
            classList: [
              when(subscribed, '-subscribed')
            ]
          }, [
            h('span.name', '#' + channel)
          ])
        }, { maxTime: 5, idle: true })
      ])
    ])
  })
}
