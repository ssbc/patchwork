var nest = require('depnest')
var ref = require('ssb-ref')
var {h, when, computed, map, send, dictToCollection, resolve} = require('mutant')

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
  'message.sync.root': 'first',
  'about.html.image': 'first',
  'feed.html.rollup': 'first',
  'feed.pull.profile': 'first',
  'sbot.async.publish': 'first',
  'keys.sync.id': 'first',
  'sheet.display': 'first',
  'profile.obs.rank': 'first',
  'profile.sheet.edit': 'first',
  'app.navigate': 'first',
  'profile.obs.contact': 'first',
  'contact.html.followToggle': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'sheet.profiles': 'first'
})
exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n
  return nest('page.html.render', function profile (id) {
    if (!ref.isFeed(id)) return
    var yourId = api.keys.sync.id()
    var name = api.about.obs.name(id)
    var description = api.about.obs.description(id)
    var contact = api.profile.obs.contact(id)

    var friends = computed([contact.following, contact.followers], (following, followers) => {
      return Array.from(following).filter(follow => followers.includes(follow))
    })

    var following = computed([contact.following, friends], (following, friends) => {
      return following.filter(follow => !friends.includes(follow))
    })

    var followers = computed([contact.followers, friends], (followers, friends) => {
      return followers.filter(follower => !friends.includes(follower))
    })

    var names = computed([api.about.obs.names(id), contact.yourFollowing, contact.following, yourId, id], filterByValues)
    var images = computed([api.about.obs.images(id), contact.yourFollowing, contact.following, yourId, id], filterByValues)

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

        when(contact.notFollowing, [
          when(contact.blockingFriendsCount, h('section -blockWarning', [
            h('a', {
              href: '#',
              'ev-click': send(displayBlockingFriends, contact.blockingFriends)
            }, [
              '⚠️ ', computed(['This person is blocked by %s of your friends.', contact.blockingFriendsCount], plural)
            ])
          ])),

          when(contact.noIncoming,
            h('section -distanceWarning', [
              h('h1', i18n(`You don't follow anyone who follows this person`)),
              h('p', i18n('You might not be seeing their latest messages. You could try joining a pub that they are a member of.')),
              when(contact.hasOutgoing,
                h('p', i18n('However, since they follow someone that follows you, they should be able to see your posts.')),
                h('p', i18n(`They might not be able to see your posts either.`))
              )
            ]),
            when(contact.noOutgoing,
              h('section -distanceWarning', [
                h('h1', i18n('This person does not follow anyone that follows you')),
                h('p', i18n('They might not receive your private messages or replies. You could try joining a pub that they are a member of.')),
                h('p', i18n('However, since you follow someone that follows them, you should be able to see their latest posts.'))
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
        ]),

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
      compactFilter: (msg) => msg.value.author !== id, // show root context messages smaller
      displayFilter: (msg) => msg.value.author === id,
      rootFilter: (msg) => !contact.youBlock() && !api.message.sync.root(msg),
      bumpFilter: (msg) => msg.value.author === id
    })

    var container = h('div', {className: 'SplitView'}, [
      h('div.main', [
        feedView
      ]),
      h('div.side.-right', [
        h('button PrivateMessageButton', {'ev-click': () => api.app.navigate('/private', {compose: {to: id}})}, i18n('Send Private Message')),
        when(contact.sync,
          h('div', [
            renderContactBlock(i18n('Friends'), friends, contact.yourFollowing),
            renderContactBlock(i18n('Followers'), followers, contact.yourFollowing),
            renderContactBlock(i18n('Following'), following, contact.yourFollowing),
            renderContactBlock(i18n('Blocked by'), contact.blockingFriends, contact.yourFollowing)
          ]),
          h('div', {className: 'Loading'})
        )
      ])
    ])

    // refresh feed (to hide all posts) when blocked
    contact.youBlock(feedView.reload)

    container.pendingUpdates = feedView.pendingUpdates
    container.reload = feedView.reload
    return container
  })

  function displayFollowedBy (profiles) {
    api.sheet.profiles(profiles, i18n('Followed by'))
  }

  function displayMutualFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Mutual Friends'))
  }

  function displayBlockingFriends (profiles) {
    api.sheet.profiles(profiles, i18n('Blocked by'))
  }

  function renderContactBlock (title, profiles, yourFollowing) {
    profiles = api.profile.obs.rank(profiles)
    return [
      when(computed(profiles, x => x.length), h('h2', title)),
      h('div', {
        classList: 'ProfileList'
      }, [
        map(profiles, (id) => {
          var following = computed(yourFollowing, f => f.includes(id))
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
