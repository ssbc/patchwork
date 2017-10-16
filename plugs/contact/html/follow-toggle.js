var nest = require('depnest')
var { h, when, send, computed } = require('mutant')

exports.gives = nest('contact.html.followToggle')
exports.needs = nest({
  'intl.sync.i18n': 'first',
  'keys.sync.id': 'first',
  'contact.async.block': 'first',
  'contact.async.unblock': 'first',
  'contact.obs.following': 'first',
  'contact.obs.followers': 'first',
  'contact.obs.blockers': 'first'
})

exports.create = function (api) {
  var i18n = api.intl.sync.i18n
  return nest('contact.html.followToggle', function (id, opts) {
    var yourId = api.keys.sync.id()

    var yourFollows = api.contact.obs.following(yourId)
    var rawFollowers = api.contact.obs.followers(id)
    var rawFollowing = api.contact.obs.following(id)

    var friends = computed([rawFollowing, rawFollowers], (following, followers) => {
      return Array.from(following).filter(follow => followers.includes(follow))
    })

    var following = computed([rawFollowing, friends], (following, friends) => {
      return Array.from(following).filter(follow => !friends.includes(follow))
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
    var youBlock = computed(blockers, function (blockers) {
      return blockers.includes(yourId)
    })

    var showBlockButton = computed([opts && opts.block], (block) => block !== false)

    if (id !== yourId) {
      return when(youBlock, [
        h('a.ToggleButton.-unblocking', {
          'href': '#',
          'title': i18n('Click to unblock'),
          'ev-click': send(api.contact.async.unblock, id)
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
        when(showBlockButton, h('a.ToggleButton.-blocking', {
          'href': '#',
          'title': i18n('Click to block syncing with this person and hide their posts'),
          'ev-click': send(api.contact.async.block, id)
        }, i18n('Block')))
      ])
    } else {
      return []
    }
  })

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
}
