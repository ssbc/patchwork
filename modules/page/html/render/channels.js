var nest = require('depnest')
var { h, send, when, computed, map } = require('mutant')

exports.needs = nest({
  'message.async.publish': 'first',
  'keys.sync.id': 'first',
  'channel.obs': {
    subscribed: 'first',
    recent: 'first'
  }
})

exports.gives = nest('page.html.render')

exports.create = function(api){
  return nest('page.html.render', function page(path){
    if (path !== '/channels') return

    var id = api.keys.sync.id()
    var channels = api.channel.obs.recent()
    var subscribedChannels = api.channel.obs.subscribed(id)
    var loading = computed(subscribedChannels.sync, x => !x)

    return h('div', { classList: 'Scroller'}, [
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
              h('span.name', '#' + channel),
              when(subscribed,
                h('a.-unsubscribe', {
                  'ev-click': send(unsubscribe, channel)
                }, 'Unsubscribe'),
                h('a.-subscribe', {
                  'ev-click': send(subscribe, channel)
                }, 'Subscribe')
              )
            ])
          }, {maxTime: 5, idle: true})
        ])
    ])


    function subscribe (id) {
      api.message.async.publish({
        type: 'channel',
        channel: id,
        subscribed: true
      })
    }

    function unsubscribe (id) {
      api.message.async.publish({
        type: 'channel',
        channel: id,
        subscribed: false
      })
    }
  })
}
