var nest = require('depnest')
var { h, when, send, computed } = require('mutant')

exports.gives = nest('contact.html.followToggle')
exports.needs = nest({
  'intl.sync.i18n': 'first',
  'profile.obs.contact': 'first',
  'message.async.publish': 'first',
  'contact.async.follow': 'first',
  'contact.async.unfollow': 'first',
  'contact.async.block': 'first',
  'contact.async.unblock': 'first'
})

exports.create = function (api) {
  var i18n = api.intl.sync.i18n
  return nest('contact.html.followToggle', function (id, opts) {
    var contact = api.profile.obs.contact(id)
    var showBlockButton = computed([opts && opts.block], (block) => block !== false)

    return when(contact.isYou, null,
      when(contact.youBlock, [
        h('a.ToggleButton.-unblocking', {
          'href': '#',
          'title': i18n('Click to unblock'),
          'ev-click': send(unblock, id)
        }, i18n('Blocked'))
      ], [
        when(contact.youFollow,
          h('a.ToggleButton.-unsubscribe', {
            'href': '#',
            'title': i18n('Click to unfollow'),
            'ev-click': send(api.contact.async.unfollow, id)
          }, when(contact.isFriends, i18n('Friends'), i18n('Following'))),
          h('a.ToggleButton.-subscribe', {
            'href': '#',
            'ev-click': send(api.contact.async.follow, id)
          }, when(contact.followsYou, i18n('Follow Back'), i18n('Follow')))
        ),
        when(showBlockButton, h('a.ToggleButton.-blocking', {
          'href': '#',
          'title': i18n('Click to block syncing with this person and hide their posts'),
          'ev-click': send(block, id)
        }, i18n('Block')))
      ])
    )
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
