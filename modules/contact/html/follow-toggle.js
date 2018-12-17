var nest = require('depnest')
var { h, when, send, computed } = require('mutant')

exports.gives = nest('contact.html.followToggle')
exports.needs = nest({
  'intl.sync.i18n': 'first',
  'keys.sync.id': 'first',
  'message.async.publish': 'first',
  'contact.async.follow': 'first',
  'contact.async.unfollow': 'first',
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

    var yourFollowers = api.contact.obs.followers(yourId)
    var yourFollowing = api.contact.obs.following(yourId)

    var followsYou = computed([yourFollowers], function (followsYou) {
      return followsYou.includes(id)
    })

    var youFollow = computed([yourFollowing], function (youFollow) {
      return youFollow.includes(id)
    })

    var isFriends = computed([followsYou, youFollow], function (a, b) {
      return a && b
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
          'ev-click': send(unblock, id)
        }, i18n('Blocked'))
      ], [
        when(youFollow,
          h('a.ToggleButton.-unsubscribe', {
            'href': '#',
            'title': i18n('Click to unfollow'),
            'ev-click': send(api.contact.async.unfollow, id)
          }, when(isFriends, i18n('Friends'), i18n('Following'))),
          h('a.ToggleButton.-subscribe', {
            'href': '#',
            'ev-click': send(api.contact.async.follow, id)
          }, when(followsYou, i18n('Follow Back'), i18n('Follow')))
        ),
        when(showBlockButton, h('a.ToggleButton.-blocking', {
          'href': '#',
          'title': i18n('Click to block syncing with this person and hide their posts'),
          'ev-click': send(block, id)
        }, i18n('Block')))
      ])
    } else {
      return []
    }
  })

  function block (id) {
    // displays message confirm
    api.message.async.publish({
      type: 'contact',
      contact: id,
      blocking: true
    })
  }

  function unblock (id) {
    // displays message confirm
    api.message.async.publish({
      type: 'contact',
      contact: id,
      blocking: false
    })
  }
}
