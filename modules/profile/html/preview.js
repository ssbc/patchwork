var nest = require('depnest')
var h = require('mutant/h')
var computed = require('mutant/computed')
var send = require('mutant/send')

exports.needs = nest({
  'about.obs': {
    name: 'first',
    description: 'first',
    names: 'first',
    images: 'first',
    color: 'first'
  },
  'blob.sync.url': 'first',
  'blob.html.input': 'first',
  'message.html.markdown': 'first',
  'about.html.image': 'first',
  'keys.sync.id': 'first',
  'sheet.display': 'first',
  'profile.obs.rank': 'first',
  'app.navigate': 'first',
  'contact.obs': {
    followers: 'first',
    following: 'first',
    blockers: 'first'
  },
  'contact.async.block': 'first',
  'contact.async.unblock': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'profile.obs.hops': 'first',
  'sheet.profiles': 'first',
  'contact.html.followToggle': 'first'
})

exports.gives = nest('profile.html.preview')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('profile.html.preview', function (id) {
    var name = api.about.obs.name(id)
    var description = api.about.obs.description(id)
    var yourId = api.keys.sync.id()
    var yourFollows = api.contact.obs.following(yourId)
    var yourFollowers = api.contact.obs.followers(yourId)

    var rawFollowers = api.contact.obs.followers(id)
    var rawFollowing = api.contact.obs.following(id)
    var hops = api.profile.obs.hops(yourId, id)

    var mutualFriends = computed([yourFollowers, yourFollows, rawFollowers, rawFollowing], (first, ...rest) => {
      return first.filter(value => rest.every((collection) => collection.includes(value)))
    })

    return h('ProfilePreview', [
      h('header', [
        h('div.image', api.about.html.image(id)),
        h('div.main', [
          h('div.title', [
            h('h1', [
              h('a', {href: id, 'ev-click': () => api.app.navigate(id)}, [name])
            ]),
            h('div.meta', [
              api.contact.html.followToggle(id, {block: false})
            ])
          ]),
          h('section -publicKey', [
            h('pre', {title: i18n('Public key for this profile')}, id)
          ])
        ])
      ]),
      computed(hops, (value) => {
        if (value) {
          if (value[0] > 2 || value[1] === undefined) {
            return h('section -distanceWarning', [
              '⚠️ ', i18n(`You don't follow anyone who follows this person`)
            ])
          } else if (value[1] > 2 || value[1] === undefined) {
            return h('section -distanceWarning', [
              '⚠️ ', i18n('This person does not follow anyone that follows you')
            ])
          } else if (value[0] === 2) {
            return h('section -mutualFriends', [
              h('a', {
                href: '#',
                'ev-click': send(displayMutualFriends, mutualFriends)
              }, [
                computed(mutualFriends, (items) => {
                  return plural('You share %s mutual friends with this person.', items.length)
                })
              ])
            ])
          } else if (value[0] === 0) {
            return h('section', [
              i18n('This is you.')
            ])
          }
        }
      })
    ])
  })

  function displayMutualFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Mutual Friends'))
  }
}
