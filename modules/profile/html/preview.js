var nest = require('depnest')
var h = require('mutant/h')
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
  'contact.html.followToggle': 'first',
  'profile.obs.contact': 'first'
})

exports.gives = nest('profile.html.preview')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('profile.html.preview', function (id) {
    var name = api.about.obs.name(id)
    var contact = api.profile.obs.contact(id)

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

      when(contact.isYou, h('section -you', [
        i18n('This is you.')
      ])),

      when(contact.notFollowing, [
        when(contact.blockingFriendsCount,
          h('section -blockWarning', [
            h('a', {
              href: '#',
              'ev-click': send(displayBlockingFriends, contact.blockingFriends)
            }, [
              '⚠️ ', computed(['This person is blocked by %s of your friends.', contact.blockingFriendsCount], plural)
            ])
          ]),
          when(contact.noOutgoing,
            h('section -distanceWarning', [
              '⚠️ ', i18n(`You don't follow anyone who follows this person`)
            ]),
            when(contact.noIncoming,
              h('section -distanceWarning', [
                '⚠️ ', i18n('This person does not follow anyone that follows you')
              ]),
              when(contact.mutualFriendsCount,
                h('section -mutualFriends', [
                  h('a', {
                    href: '#',
                    'ev-click': send(displayMutualFriends, contact.mutualFriends)
                  }, [
                    '👥 ', computed(['You share %s mutual friends with this person.', contact.mutualFriendsCount], plural)
                  ])
                ])
              )
            )
          )
        )
      ])
    ])
  })

  function displayMutualFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Mutual Friends'))
  }

  function displayBlockingFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Blocked by'))
  }
}
