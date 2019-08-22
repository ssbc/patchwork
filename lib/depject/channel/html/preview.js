const nest = require('depnest')
const h = require('mutant/h')
const when = require('mutant/when')
const computed = require('mutant/computed')
const send = require('mutant/send')

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
    const yourId = api.keys.sync.id()
    const channel = api.channel.sync.normalize(id)
    let href = '#' + channel
    try {
      href = decodeURIComponent(href)
    } catch (e) {
      // Safely ignore because it wasn't URI-encoded. :)
    }
    const subscribers = api.channel.obs.subscribers(id)
    const following = api.contact.obs.following(yourId)
    const followingSubscribers = computed([subscribers, following], (a, b) => {
      return a.filter(v => b.includes(v))
    })
    const followingSubscriberCount = computed(followingSubscribers, x => x.length)

    return h('ProfilePreview', [
      h('header', [
        h('div.main', [
          h('div.title', [
            h('h1', [
              h('a', { href, 'ev-click': () => api.app.navigate(href) }, [href])
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
