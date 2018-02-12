var nest = require('depnest')
var h = require('mutant/h')
var map = require('mutant/map')
var when = require('mutant/when')
var computed = require('mutant/computed')
var send = require('mutant/send')

exports.needs = nest({
  'about.obs.name': 'first',
  'about.html.image': 'first',
  'keys.sync.id': 'first',
  'sheet.display': 'first',
  'app.navigate': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'sheet.profiles': 'first',
  'channel.html.subscribeToggle': 'first',
  'channel.sync.normalize': 'first',
  'channel.obs.subscribers': 'first',
  'contact.obs.following': 'first'
})

exports.gives = nest('channel.html.preview')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('channel.html.preview', function (id) {
    var yourId = api.keys.sync.id()
    var channel = api.channel.sync.normalize(id)
    var href = '#' + channel
    var subscribers = api.channel.obs.subscribers(id)
    var following = api.contact.obs.following(yourId)
    var followingSubscribers = computed([subscribers, following], (a, b) => {
      return a.filter(v => b.includes(v))
    })
    var followingSubscriberCount = computed(followingSubscribers, x => x.length)

    return h('ProfilePreview', [
      h('header', [
        h('div.main', [
          h('div.title', [
            h('h1', [
              h('a', {href, 'ev-click': () => api.app.navigate(href)}, [href])
            ]),
            h('div.meta', [
              api.channel.html.subscribeToggle(channel)
            ])
          ])
        ])
      ]),

      when(followingSubscriberCount,
        h('section -mutualFriends', [
          h('a', {
            href: '#',
            'ev-click': send(displaySubscribingFriends, followingSubscribers)
          }, [
            '👥 ', computed(['You follow %s people that subscribe to this channel.', followingSubscriberCount], plural)
          ])
        ])
      )
    ])
  })

  function displaySubscribingFriends (profiles) {
    api.sheet.profiles(profiles, i18n('People you follow that subscribe to this channel'))
  }
}
