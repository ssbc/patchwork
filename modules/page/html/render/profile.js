var nest = require('depnest')
var ref = require('ssb-ref')
var {Value, h, when, computed, map, send, dictToCollection} = require('mutant')
var extend = require('xtend')

exports.needs = nest({
  'about.obs': {
    name: 'first',
    names: 'first',
    images: 'first',
    color: 'first'
  },
  'blob.sync.url': 'first',
  'about.html.image': 'first',
  'feed.html.rollup': 'first',
  'sbot.pull.userFeed': 'first',
  'sbot.async.publish': 'first',
  'keys.sync.id': 'first',
  'contact.obs': {
    followers: 'first',
    following: 'first'
  }
})
exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function profile (id) {
    if (!ref.isFeed(id)) return

    var name = api.about.obs.name(id)
    var yourId = api.keys.sync.id()
    var yourFollows = api.contact.obs.following(yourId)
    var rawFollowers = api.contact.obs.followers(id)
    var rawFollowing = api.contact.obs.following(id)
    var friendsLoaded = computed([rawFollowers.sync, rawFollowing.sync], (...x) => x.every(Boolean))

    var friends = computed([rawFollowing, rawFollowers], (following, followers) => {
      return Array.from(following).filter(follow => followers.has(follow))
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
      return youFollow.has(id)
    })

    var names = api.about.obs.names(id)
    var images = api.about.obs.images(id)

    var namePicker = h('div', {className: 'Picker'}, [
      map(dictToCollection(names), (item) => {
        var isSelf = computed(item.value, (ids) => ids.includes(id))
        var isAssigned = computed(item.value, (ids) => ids.includes(yourId))
        return h('a.name', {
          classList: [
            when(isSelf, '-self'),
            when(isAssigned, '-assigned')
          ],
          title: nameList(when(isSelf, 'Self Assigned', 'Assigned By'), item.value)
        }, [
          item.key
        ])
      })
    ])

    var imagePicker = h('div', {className: 'Picker'}, [
      map(dictToCollection(images), (item) => {
        var isSelf = computed(item.value, (ids) => ids.includes(id))
        var isAssigned = computed(item.value, (ids) => ids.includes(yourId))
        return h('a.name', {
          classList: [
            when(isSelf, '-self'),
            when(isAssigned, '-assigned')
          ],
          title: nameList(when(isSelf, 'Self Assigned', 'Assigned By'), item.value)
        }, [
          h('img', {
            className: 'Avatar',
            style: { 'background-color': api.about.obs.color(id) },
            src: computed(item.key, api.blob.sync.url)
          })
        ])
      })
    ])

    var prepend = h('header', {className: 'ProfileHeader'}, [
      h('div.image', api.about.html.image(id)),
      h('div.main', [
        h('div.title', [
          h('h1', ['@', name]),
          h('div.meta', [
            when(id === yourId, [
              h('a.ToggleButton.-disabled', 'This is you!')
            ], [
              when(youFollow,
                h('a.ToggleButton.-unsubscribe', {
                  'href': '#',
                  'title': 'Click to unfollow',
                  'ev-click': send(unfollow, id)
                }, when(isFriends, 'Friends', 'Following')),
                h('a.ToggleButton.-subscribe', {
                  'href': '#',
                  'ev-click': send(follow, id)
                }, when(followsYou, 'Follow Back', 'Follow'))
              )
            ])
          ])
        ]),
        h('section', [ namePicker, imagePicker ])
      ])
    ])

    return h('div', {className: 'SplitView'}, [
      h('div.main', [
        api.feed.html.rollup((opts) => {
          return api.sbot.pull.userFeed(extend(opts, {id}))
        }, { prepend })
      ]),
      h('div.side.-right', [
        when(friendsLoaded,
          h('div', [
            renderContactBlock('Friends', friends),
            renderContactBlock('Followers', followers),
            renderContactBlock('Following', following)
          ]),
          h('div', {className: 'Loading'})
        )
      ])
    ])
  })

  function renderContactBlock (title, profiles) {
    return [
      when(computed(profiles, x => x.length), h('h2', title)),
      h('div', {
        classList: 'ProfileList'
      }, [
        map(profiles, (id) => {
          return h('a.profile', {
            href: id
          }, [
            h('div.avatar', [api.about.html.image(id)]),
            h('div.main', [
              h('div.name', [ '@', api.about.obs.name(id) ])
            ])
          ])
        }, {
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

  function nameList (prefix, ids) {
    var items = map(ids, api.about.obs.name)
    return computed([prefix, items], (prefix, names) => {
      return (prefix ? (prefix + '\n') : '') + names.map((n) => `- ${n}`).join('\n')
    })
  }
}
