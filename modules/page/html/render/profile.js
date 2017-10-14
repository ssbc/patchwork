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
  'contact.async.block': 'first',
  'contact.async.unblock': 'first',
  'intl.sync.i18n': 'first',
})
exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function profile (id) {
    if (!ref.isFeed(id)) return

    var name = api.about.obs.name(id)
    var description = api.about.obs.description(id)
    var yourId = api.keys.sync.id()
    var yourFollows = api.contact.obs.following(yourId)
    var rawFollowers = api.contact.obs.followers(id)
    var rawFollowing = api.contact.obs.following(id)
    var friendsLoaded = computed([rawFollowers.sync, rawFollowing.sync], (...x) => x.every(Boolean))
    var { block, unblock } = api.contact.async

    var friends = computed([rawFollowing, rawFollowers], (following, followers) => {
      return Array.from(following).filter(follow => followers.includes(follow))
    })

    var following = computed([rawFollowing, friends], (following, friends) => {
      return Array.from(following).filter(follow => !friends.includes(follow))
    })

    var followers = computed([rawFollowers, friends], (followers, friends) => {
      return Array.from(followers).filter(follower => !friends.includes(follower))
    })

    var isFriends = computed([friends], function (friends) {
      return friends.includes(yourId)
    })

    var followsYou = computed([following], function (followsYou) {
      return followsYou.includes(yourId)
    })

    var youFollow = computed([yourFollows], function (youFollow) {
      return youFollow.includes(id)
    })

    var blockers = api.contact.obs.blockers(id)
    var youBlock = computed(blockers, function(blockers) {
      return blockers.includes(yourId)
    })

    var names = api.about.obs.names(id)
    var images = api.about.obs.images(id)

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
        href: '#',
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
              when(youBlock, [
                h('a.ToggleButton.-unblocking', {
                  'href': '#',
                  'title': i18n('Click to unblock'),
                  'ev-click': () => unblock(id, console.log)
                }, i18n('Blocked'))
              ], [
                when(youFollow,
                  h('a.ToggleButton.-unsubscribe', {
                    'href': '#',
                    'title': i18n('Click to unfollow'),
                    'ev-click': send(unfollow, id)
                  }, when(isFriends, i18n('Friends'), i18n('Following'))),
                  h('a.ToggleButton.-subscribe', {
                    'href': '#',
                    'ev-click': send(follow, id)
                  }, when(followsYou, i18n('Follow Back'), i18n('Follow')))
                ),
                h('a.ToggleButton.-blocking', {
                  'href': '#',
                  'title': i18n('Block'),
                  'ev-click': () => block(id, console.log)
                }, i18n('Block'))
              ])
            ])
          ])
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

  function follow (id) {
    api.sbot.async.publish({
      type: 'contact',
      contact: id,
      following: true
    })
  }

  function unfollow (id) {
    api.sbot.async.publish({
      type: 'contact',
      contact: id,
      following: false
    })
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
