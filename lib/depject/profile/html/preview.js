const nest = require('depnest')
const h = require('mutant/h')
const map = require('mutant/map')
const when = require('mutant/when')
const computed = require('mutant/computed')
const send = require('mutant/send')
const removeMd = require('remove-markdown')

exports.needs = nest({
  'about.obs.name': 'first',
  'about.obs.description': 'first',
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
    const idLen = id.length
    const name = api.about.obs.name(id)
    const contact = api.profile.obs.contact(id)
    const description = api.about.obs.description(id)

    return h('ProfilePreview', [
      h('header', [
        h('div.image', api.about.html.image(id)),
        h('div.main', [
          h('div.title', [
            h('h1', [
              h('a', { href: '#', 'ev-click': () => api.app.navigate(id) }, [name])
            ]),
            h('div.meta', [
              api.contact.html.followToggle(id, { block: false })
            ])
          ]),
          h('section -publicKey', [
            h('pre', { title: i18n('Public key for this profile') }, id)
          ]),
          h(
            'section -profile', [
              computed(description, (description) => {
                const txt = removeMd(description)
                const summary = shortenDescription(txt, idLen)
                return summary
              })]
          )
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
              '⚠️ ', i18n('This person does not follow anyone that follows you')
            ]),
            when(contact.noIncoming,
              h('section -distanceWarning', [
                '⚠️ ', i18n('You don\'t follow anyone who follows this person')
              ]),
              when(contact.mutualFriendsCount,
                h('section -mutualFriends', [
                  h('a', {
                    href: '#',
                    title: nameList(i18n('Mutual Friends'), contact.mutualFriends),
                    'ev-click': send(displayMutualFriends, contact.mutualFriends)
                  }, [
                    '👥 ', computed(['You share %s mutual friends with this person.', contact.mutualFriendsCount], plural)
                  ])
                ]),
                h('section -mutualFriends', [
                  h('a', {
                    href: '#',
                    title: nameList(i18n('Followed by'), contact.incomingVia),
                    'ev-click': send(displayFollowedBy, contact.incomingVia)
                  }, [
                    '👥 ', computed(['You follow %s people that follow this person.', contact.incomingViaCount], plural)
                  ])
                ])
              )
            )
          )
        )
      ])
    ])
  })

  function shortenDescription (txt, len) {
    if (txt == null) {
      return ''
    }
    const line1 = txt.trim().split('\n', 1)[0]
    if (line1.length <= len) {
      return line1
    }
    const words = line1.split(' ')
    let result = words.shift()
    if (result.length > len) {
      return result.splice(0, len - 1) + ' …'
    }
    for (let i = 0; i < len; i++) {
      const currentWord = words.shift()
      // + 1 for the joining space, and +2 for the final ellipsis
      if (result.length + 1 + currentWord.length + 2 <= len) {
        result += ` ${currentWord}`
      } else {
        break
      }
    }
    return result + ' …'
  }

  function displayMutualFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Mutual Friends'))
  }

  function displayFollowedBy (profiles) {
    api.sheet.profiles(profiles, i18n('Followed by'))
  }

  function displayBlockingFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Blocked by'))
  }

  function nameList (prefix, ids) {
    const items = map(ids, api.about.obs.name)
    return computed([prefix, items], (prefix, names) => {
      return (prefix ? (prefix + '\n') : '') + names.map((n) => `- ${n}`).join('\n')
    })
  }
}
