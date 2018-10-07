var { h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'message.html.compose': 'first',
  'channel.sync.normalize': 'first',
  'channel.html.subscribeToggle': 'first',
  'feed.html.rollup': 'first',
  'feed.html.followWarning': 'first',
  'sbot.pull.resumeStream': 'first',
  'sbot.pull.stream': 'first',
  'sbot.pull.log': 'first',
  'message.async.publish': 'first',
  'keys.sync.id': 'first',
  'intl.sync.i18n': 'first',
  'settings.obs.get': 'first',
  'profile.obs.contact': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '#') return

    var id = api.keys.sync.id()
    var contact = api.profile.obs.contact(id)

    var channel = api.channel.sync.normalize(path.substr(1))

    var prepend = [
      h('PageHeading', [
        h('h1', `#${channel}`),
        h('div.meta', [
          api.channel.html.subscribeToggle(channel)
        ])
      ]),
      api.message.html.compose({
        meta: { type: 'post', channel },
        placeholder: i18n('Write a message in this channel')
      }),
      noVisibleNewPostsWarning()
    ]

    const filters = api.settings.obs.get('filters')

    var getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.channelFeed.roots(opts)
    }, { limit: 40, reverse: true, channel })

    const channelView = api.feed.html.rollup(getStream, {
      prepend,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.channelFeed.latest({ channel }))
    })

    // call reload whenever filters changes
    filters(channelView.reload)

    return channelView

    function noVisibleNewPostsWarning () {
      var warning = i18n('You may not be able to see new channel content until you follow some users or pubs.')
      return api.feed.html.followWarning(contact.isNotFollowingAnybody, warning)
    }
  })
}
