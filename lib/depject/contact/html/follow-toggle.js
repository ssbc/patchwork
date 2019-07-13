var nest = require('depnest')
var electron = require('electron')
var { h, when, computed } = require('mutant')

exports.gives = nest('contact.html.followToggle')
exports.needs = nest({
  'intl.sync.i18n': 'first',
  'keys.sync.id': 'first',
  'message.async.publish': 'first',
  'sbot.async.publish': 'first',
  'contact.obs.states': 'first',
  'contact.obs.followers': 'first',
  'contact.obs.blockers': 'first',
  'contact.obs.ignores': 'first'
})

exports.create = function (api) {
  var i18n = api.intl.sync.i18n
  return nest('contact.html.followToggle', function (id, opts) {
    var yourId = api.keys.sync.id()

    var states = api.contact.obs.states(yourId)
    var yourFollowers = api.contact.obs.followers(yourId)
    var ignores = api.contact.obs.ignores()

    var followsYou = computed([yourFollowers], function (yourFollowers) {
      return yourFollowers.includes(id)
    })

    var youIgnore = computed([ignores], function (ignores) {
      return !!ignores[id]
    })

    var youListening = computed([ignores], function (ignores) {
      return ignores[id] === false
    })

    var youFollow = computed([states], function (states) {
      return states[id] === true
    })

    var youBlock = computed([states], function (states) {
      return states[id] === false
    })

    var isFriends = computed([followsYou, youFollow], function (a, b) {
      return a && b
    })

    var ignoreText = when(youIgnore, ' ' + i18n('(ignored)'))
    var listeningText = when(youListening, ' ' + i18n('(listening)'))

    var showBlockButton = computed([opts && opts.block], (block) => block !== false)

    if (id !== yourId) {
      return [
        when(youBlock, [
          h('a ToggleButton -unblocking', {
            href: '#',
            title: i18n('Click to unblock'),
            'ev-click': () => setStatus(id, null, { states, ignores })
          }, [i18n('Blocked'), listeningText])
        ], [
          when(youFollow,
            h('a ToggleButton -unsubscribe', {
              href: '#',
              title: i18n('Click to unfollow'),
              'ev-click': () => setStatus(id, null, { states, ignores })
            }, [when(isFriends, i18n('Friends'), i18n('Following')), ignoreText]),
            h('a ToggleButton -subscribe', {
              href: '#',
              'ev-click': () => setStatus(id, true, { states, ignores })
            }, [when(followsYou, i18n('Follow Back'), i18n('Follow')), ignoreText])
          )
        ]),
        when(showBlockButton, h('a ToggleButton -drop -options', {
          href: '#',
          title: i18n('Click for options to block syncing with this person and/or hide their posts'),
          'ev-click': (ev) => popupContactMenu(ev.currentTarget, id, { states, ignores })
        }, i18n('Options')))
      ]
    } else {
      return []
    }
  })

  function popupContactMenu (element, id, { states, ignores }) {
    var rects = element.getBoundingClientRect()
    var status = states()[id]
    var ignoring = ignores()[id]

    // the actual listening state (use the explicit ignore if available, otherwise depends if blocking)
    var resolvedIgnoring = ignoring != null
      ? ignoring
      : status === false

    electron.remote.getCurrentWindow().webContents.getZoomFactor((factor) => {
      var menu = electron.remote.Menu.buildFromTemplate([
        { type: 'radio',
          label: 'Neutral',
          checked: status == null,
          click: () => setStatus(id, null, { states, ignores })
        },
        { type: 'radio',
          label: 'Follow',
          checked: status === true,
          click: () => setStatus(id, true, { states, ignores })
        },
        { type: 'radio',
          label: 'Block',
          checked: status === false,
          click: () => setStatus(id, false, { states, ignores })
        },
        { type: 'separator' },
        { type: 'radio',
          label: 'Listen',
          checked: !resolvedIgnoring,
          click: () => setIgnore(id, false, { states, ignores })
        },
        { type: 'radio',
          label: 'Ignore',
          checked: resolvedIgnoring,
          click: () => setIgnore(id, true, { states, ignores })
        }
      ])
      menu.popup({
        window: electron.remote.getCurrentWindow(),
        x: Math.round(rects.left * factor),
        y: Math.round(rects.bottom * factor) + 4
      })
    })
  }

  function setStatus (id, status, { states, ignores }) {
    var currentStatus = states()[id]
    var currentIgnoring = ignores()[id]

    if (!looseMatch(status, currentStatus)) {
      var message = {
        type: 'contact',
        contact: id
      }

      if (status === true) { // FOLLOW
        message.following = true
      } else if (status === false) { // BLOCK
        message.blocking = true
      } else if (currentStatus === true) { // UNFOLLOW
        message.following = false
      } else if (currentStatus === false) { // UNBLOCK
        message.blocking = false
      }

      api.message.async.publish(message, (err) => {
        if (!err && currentIgnoring && status !== false) {
          // if we are currently ignoring (private blocking)
          // renew the action for ssb-friends compatibility
          // unless this is a block action
          api.sbot.async.publish({
            recps: [api.keys.sync.id()],
            type: 'contact',
            contact: id,
            blocking: true
          })
        }
      })
    }
  }

  function setIgnore (id, ignoring, { states, ignores }) {
    var currentStatus = states()[id]
    var currentIgnoring = ignores()[id]
    var yourId = api.keys.sync.id()

    if (!looseMatch(ignoring, currentIgnoring)) {
      if (ignoring === false && currentStatus === false) {
        // user is publicly blocking, but wants to still see this feed
        api.sbot.async.publish({
          recps: [yourId],
          type: 'contact',
          blocking: false,
          following: false,
          contact: id
        })
      } else if (ignoring === true) {
        // user wants to ignore (privately block) this feed
        api.sbot.async.publish({
          recps: [yourId],
          type: 'contact',
          blocking: true,
          contact: id
        })
      } else {
        // user wants to stop ignoring this feed (remove ignore)
        api.sbot.async.publish({
          recps: [yourId],
          type: 'contact',
          contact: id,
          following: currentStatus === true
        })
      }
    }
  }
}

function looseMatch (a, b) {
  return a === b || (a == null && b == null)
}
