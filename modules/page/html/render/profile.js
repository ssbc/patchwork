var nest = require('depnest')
var ref = require('ssb-ref')
var {h, when, computed, map, send, dictToCollection, resolve} = require('mutant')
var extend = require('xtend')

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
  'message.async.publish': 'first',
  'message.html.markdown': 'first',
  'about.html.image': 'first',
  'feed.html.rollup': 'first',
  'feed.pull.profile': 'first',
  'sbot.async.publish': 'first',
  'keys.sync.id': 'first',
  'sheet.display': 'first',
  'profile.obs.rank': 'first',
  'profile.sheet.edit': 'first',
  'app.navigate': 'first',
  'contact.obs': {
    followers: 'first',
    following: 'first',
    blockers: 'first'
  },
  'contact.html.followToggle': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'profile.obs.hops': 'first',
  'sheet.profiles': 'first'
})
exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n
  return nest('page.html.render', function profile (id) {
    if (!ref.isFeed(id)) return

    var name = api.about.obs.name(id)
    var description = api.about.obs.description(id)
    var yourId = api.keys.sync.id()
    var yourFollows = api.contact.obs.following(yourId)
    var yourFollowers = api.contact.obs.followers(yourId)

    var rawFollowers = api.contact.obs.followers(id)
    var rawFollowing = api.contact.obs.following(id)
    var friendsLoaded = computed([rawFollowers.sync, rawFollowing.sync], (...x) => x.every(Boolean))

    var hops = api.profile.obs.hops(yourId, id)

    var friends = computed([rawFollowing, rawFollowers], (following, followers) => {
      return Array.from(following).filter(follow => followers.includes(follow))
    })

    var following = computed([rawFollowing, friends], (following, friends) => {
      return Array.from(following).filter(follow => !friends.includes(follow))
    })

    var followers = computed([rawFollowers, friends], (followers, friends) => {
      return Array.from(followers).filter(follower => !friends.includes(follower))
    })

    var blockers = api.contact.obs.blockers(id)
    var youBlock = computed(blockers, function (blockers) {
      return blockers.includes(yourId)
    })

    var yourBlockingFriends = computed([yourFollowers, yourFollows, blockers], inAllSets)
    var mutualFriends = computed([yourFollowers, yourFollows, rawFollowers, rawFollowing], inAllSets)

    var names = computed([api.about.obs.names(id), yourFollows, rawFollowing, yourId, id], filterByValues)
    var images = computed([api.about.obs.images(id), yourFollows, rawFollowing, yourId, id], filterByValues)

    var namePicker = h('div', {className: 'Picker'}, [
      map(dictToCollection(names), (item) => {
        var isSelf = computed(item.value, (ids) => ids.includes(id))
        var isAssigned = computed(item.value, (ids) => ids.includes(yourId))
        return h('a.name', {
          'ev-click': () => {
            if (!isAssigned()) {
              assignName(id, resolve(item.key))
            }
          },
          href: '#',
          classList: [
            when(isSelf, '-self'),
            when(isAssigned, '-assigned')
          ],
          title: nameList(when(isSelf, i18n('Self Assigned'), i18n('Assigned By')), item.value)
        }, [
          item.key
        ])
      }),
      h('a -add', {
        'ev-click': () => {
          rename(id)
        },
        href: '#'
      }, ['+'])
    ])

    var imagePicker = h('div', {className: 'Picker'}, [
      map(dictToCollection(images), (item) => {
        var isSelf = computed(item.value, (ids) => ids.includes(id))
        var isAssigned = computed(item.value, (ids) => ids.includes(yourId))
        return h('a.name', {
          'ev-click': () => {
            if (!isAssigned()) {
              assignImage(id, resolve(item.key))
            }
          },
          href: '#',
          classList: [
            when(isSelf, '-self'),
            when(isAssigned, '-assigned')
          ],
          title: nameList(when(isSelf, i18n('Self Assigned'), i18n('Assigned By')), item.value)
        }, [
          h('img', {
            className: 'Avatar',
            style: { 'background-color': api.about.obs.color(id) },
            src: computed(item.key, api.blob.sync.url)
          })
        ])
      }),
      h('span.add', [
        api.blob.html.input(file => {
          assignImage(id, file.link)
        }, {
          accept: 'image/*',
          resize: { width: 500, height: 500 }
        })
      ])
    ])

    var prepend = h('header', {className: 'ProfileHeader'}, [
      h('div.image', api.about.html.image(id)),
      h('div.main', [
        h('div.title', [
          h('h1', [name]),
          h('div.meta', [
            when(id === yourId, [
              h('button', {'ev-click': api.profile.sheet.edit}, i18n('Edit Your Profile'))
            ], [
              api.contact.html.followToggle(id)
            ])
          ])
        ]),
        h('section -publicKey', [
          h('pre', {title: i18n('Public key for this profile')}, id)
        ]),

        computed([hops, yourBlockingFriends, youBlock], (value, yourBlockingFriends, youBlock) => {
          if (value) {
            if ((value[0] > 1 || youBlock) && yourBlockingFriends.length > 0) {
              return h('section -blockWarning', [
                h('a', {
                  href: '#',
                  'ev-click': send(displayBlockingFriends, yourBlockingFriends)
                }, [
                  '⚠️ ', plural('This person is blocked by %s of your friends.', yourBlockingFriends.length)
                ])
              ])
            } else if (value[0] > 2 || value[1] === undefined) {
              return h('section -distanceWarning', [
                h('h1', i18n(`You don't follow anyone who follows this person`)),
                h('p', i18n('You might not be seeing their latest messages. You could try joining a pub that they are a member of.'))
              ])
            } else if (value[1] > 2 || value[1] === undefined) {
              return h('section -distanceWarning', [
                h('h1', i18n('This person does not follow anyone that follows you')),
                h('p', i18n('They might not receive your private messages or replies. You could try joining a pub that they are a member of.'))
              ])
            } else if (value[0] === 2) {
              return h('section -mutualFriends', [
                h('a', {
                  href: '#',
                  'ev-click': send(displayMutualFriends, mutualFriends)
                }, [
                  '👥 ',
                  computed(mutualFriends, (items) => {
                    return plural('You share %s mutual friends with this person.', items.length)
                  })
                ])
              ])
            }
          }
        }),

        h('section -description', [
          computed(description, (text) => {
            if (typeof text === 'string') {
              return api.message.html.markdown(text)
            }
          })
        ]),
        h('section', [ namePicker, imagePicker ])
      ])
    ])

    var feedView = api.feed.html.rollup(api.feed.pull.profile(id), {
      prepend,
      displayFilter: (msg) => msg.value.author === id,
      rootFilter: (msg) => !youBlock(),
      bumpFilter: (msg) => msg.value.author === id
    })

    var container = h('div', {className: 'SplitView'}, [
      h('div.main', [
        feedView
      ]),
      h('div.side.-right', [
        h('button PrivateMessageButton', {'ev-click': () => api.app.navigate('/private', {compose: {to: id}})}, i18n('Send Private Message')),
        when(friendsLoaded,
          h('div', [
            renderContactBlock(i18n('Friends'), friends, yourFollows),
            renderContactBlock(i18n('Followers'), followers, yourFollows),
            renderContactBlock(i18n('Following'), following, yourFollows)
          ]),
          h('div', {className: 'Loading'})
        )
      ])
    ])

    // refresh feed (to hide all posts) when blocked
    youBlock(feedView.reload)

    container.pendingUpdates = feedView.pendingUpdates
    container.reload = feedView.reload
    return container
  })

  function displayMutualFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Mutual Friends'))
  }

  function displayBlockingFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Blocked by'))
  }

  function renderContactBlock (title, profiles, yourFollows) {
    profiles = api.profile.obs.rank(profiles)
    return [
      when(computed(profiles, x => x.length), h('h2', title)),
      h('div', {
        classList: 'ProfileList'
      }, [
        map(profiles, (id) => {
          var following = computed(yourFollows, f => f.includes(id))
          return h('a.profile', {
            href: id,
            classList: [
              when(following, '-following')
            ]
          }, [
            h('div.avatar', [api.about.html.image(id)]),
            h('div.main', [
              h('div.name', [ api.about.obs.name(id) ])
            ])
          ])
        }, {
          maxTime: 5,
          idle: true
        })
      ])
    ]
  }

  function assignImage (id, image) {
    api.message.async.publish({
      type: 'about',
      about: id,
      image
    })
  }

  function assignName (id, name) {
    api.message.async.publish({
      type: 'about',
      about: id,
      name
    })
  }

  function rename (id) {
    api.sheet.display(close => {
      var currentName = api.about.obs.name(id)
      var input = h('input', {
        style: {'font-size': '150%'},
        value: currentName()
      })
      setTimeout(() => {
        input.focus()
        input.select()
      }, 5)
      return {
        content: h('div', {
          style: {
            padding: '20px',
            'text-align': 'center'
          }
        }, [
          h('h2', {
            style: {
              'font-weight': 'normal'
            }
          }, [i18n('What whould you like to call '), h('strong', [currentName]), '?']),
          input
        ]),
        footer: [
          h('button -save', {
            'ev-click': () => {
              if (input.value.trim() && input.value !== currentName()) {
                // no confirm
                api.sbot.async.publish({
                  type: 'about',
                  about: id,
                  name: input.value.trim()
                })
              }
              close()
            }
          }, i18n('Confirm')),
          h('button -cancel', {
            'ev-click': close
          }, i18n('Cancel'))
        ]
      }
    })
  }

  function nameList (prefix, ids) {
    var items = map(ids, api.about.obs.name)
    return computed([prefix, items], (prefix, names) => {
      return (prefix ? (prefix + '\n') : '') + names.map((n) => `- ${n}`).join('\n')
    })
  }
}

function filterByValues (attributes, ...matchValues) {
  return Object.keys(attributes).reduce((result, key) => {
    var values = attributes[key].filter(value => {
      return matchValues.some(matchValue => {
        if (Array.isArray(matchValue)) {
          return matchValue.includes(value)
        } else {
          return matchValue === value
        }
      })
    })
    if (values.length) {
      result[key] = values
    }
    return result
  }, {})
}

function inAllSets (first, ...rest) {
  return first.filter(value => rest.every((collection) => collection.includes(value)))
}
