var combine = require('depject')
var entry = require('depject/entry')
var electron = require('electron')
var h = require('mutant/h')
var when = require('mutant/when')
var map = require('mutant/map')
var send = require('mutant/send')
var onceTrue = require('mutant/once-true')
var computed = require('mutant/computed')
var catchLinks = require('./lib/catch-links')
var insertCss = require('insert-css')
var nest = require('depnest')
var LatestUpdate = require('./lib/latest-update')
var ref = require('ssb-ref')
var setupContextMenuAndSpellCheck = require('./lib/context-menu-and-spellcheck')

module.exports = function (config) {
  var sockets = combine(
    overrideConfig(config),
    addCommand('app.navigate', setView),
    require('./modules'),
    require('./plugs'),
    require('patchcore'),
    require('./overrides')
  )

  var api = entry(sockets, nest({
    'config.sync.load': 'first',
    'keys.sync.id': 'first',
    'sbot.obs.connection': 'first',
    'sbot.async.get': 'first',
    'blob.sync.url': 'first',
    'page.html.render': 'first',
    'app.html.search': 'first',
    'app.views': 'first',
    'app.sync.externalHandler': 'first',
    'app.html.progressNotifier': 'first',
    'about.html.image': 'first',
    'about.obs.name': 'first',
    'contact.obs.following': 'first',
    'message.async.publish': 'first',
    'progress.html.peer': 'first',
    'sbot.obs': {
      connectedPeers: 'first',
      localPeers: 'first'
    },
    'channel.obs': {
      subscribed: 'first',
      recent: 'first'
    },
    'invite.sheet': 'first',
    'profile.sheet.edit': 'first',
    'profile.obs.recentlyUpdated': 'first',
    'app.navigate': 'first'
  }))

  setupContextMenuAndSpellCheck(api.config.sync.load())

  var id = api.keys.sync.id()
  var latestUpdate = LatestUpdate()
  var subscribedChannels = api.channel.obs.subscribed(id)
  var loading = computed(subscribedChannels.sync, x => !x)
  var channels = computed(api.channel.obs.recent(), items => items.slice(0, 8), {comparer: arrayEq})
  var following = api.contact.obs.following(id)
  var connectedPeers = api.sbot.obs.connectedPeers()
  var localPeers = api.sbot.obs.localPeers()
  var connectedPubs = computed([connectedPeers, localPeers], (c, l) => c.filter(x => !l.includes(x)))

  // prompt to setup profile on first use
  onceTrue(api.sbot.obs.connection, (sbot) => {
    sbot.latestSequence(sbot.id, (_, key) => {
      if (key == null) {
        api.profile.sheet.edit()
      }
    })
  })

  var views = api.app.views(api.page.html.render, [
    '/public', '/private', id, '/mentions'
  ])

  insertCss(require('./styles'))

  var container = h(`MainWindow -${process.platform}`, [
    h('div.top', [
      h('div.SplitView', [
        h('div.side', [
          h('span.history', [
            h('a', {
              'ev-click': views.goBack,
              classList: [ when(views.canGoBack, '-active') ]
            }),
            h('a', {
              'ev-click': views.goForward,
              classList: [ when(views.canGoForward, '-active') ]
            })
          ]),
          h('span.logo', {
            'ev-click': function () { views.setView('/public')}
          }, 'MMMMM')
        ]),
        h('div.main', [
          h('div.wrapper', [
            api.app.html.search(api.app.navigate),
            tab('Mentions', '/mentions'),
            tab('Profile', id)
          ])
        ])
      ]),
    ]),
    when(latestUpdate,
      h('div.info', [
        h('a.message -update', { href: 'https://github.com/ssbc/patchwork/releases' }, [
          h('strong', ['Patchwork ', latestUpdate, ' has been released.']), ' Click here to download and view more info!'
        ])
      ])
    ),
    api.app.html.progressNotifier(),
    h('div.SplitView', [
      h('div.side', [
        getSidebar()
      ]),
      views.html
    ])
  ])

  catchLinks(container, (href, external) => {
    if (external) {
      electron.shell.openExternal(href)
    } else if (ref.isBlob(href)) {
      electron.shell.openExternal(api.blob.sync.url(href))
    } else if (ref.isMsg(href)) {
      getExternalHandler(href, (err, handler) => {
        if (err) throw err
        if (handler) {
          handler(href)
        } else {
          api.app.navigate(href)
        }
      })
    } else {
      api.app.navigate(href)
    }
  })

  return container

  // scoped

  function setView (href) {
    views.setView(href)
  }

  function getExternalHandler (key, cb) {
    api.sbot.async.get(key, function (err, value) {
      if (err) return cb(err)
      cb(null, api.app.sync.externalHandler({key, value}))
    })
  }

  function getSidebar () {
    var whoToFollow = computed([following, api.profile.obs.recentlyUpdated(), localPeers], (following, recent, peers) => {
      return Array.from(recent).filter(x => x !== id && !following.has(x) && !peers.includes(x)).slice(0, 10)
    })
    return [
      h('h2', 'News feed'),
      h('NewsfeedList', [
        tab('Public', '/public'),
        tab('Private', '/private'),
        h('a', {
          href: '/all',
          classList: [
            when(selected('/all'), '-selected')
          ]
        }, 'Everything')
      ]),

      when(computed(channels, x => x.length), h('h2', 'Channels')),
      when(loading, [ h('Loading') ]),
      h('div', {
        classList: 'ChannelList',
        hidden: loading
      }, [
        map(channels, (channel) => {
          var subscribed = subscribedChannels.has(channel)
          return h('a.channel', {
            href: '#' + channel,
            classList: [
              when(selected('#' + channel), '-selected'),
              when(subscribed, '-subscribed')
            ]
          }, [
            h('span.name', '#' + channel),
            when(subscribed,
              h('a.-unsubscribe', {
                'ev-click': send(unsubscribe, channel)
              }, 'Unsubscribe'),
              h('a.-subscribe', {
                'ev-click': send(subscribe, channel)
              }, 'Subscribe')
            )
          ])
        }, {maxTime: 5})
      ]),

      PubList(connectedPubs),
      LocalPeerList(localPeers),

      when(computed(whoToFollow, x => x.length), h('h2', 'Who to follow')),
      when(following.sync,
        h('div', {
          classList: 'ProfileList'
        }, [
          map(whoToFollow, (id) => {
            return h('a.profile', {
              href: id
            }, [
              h('div.avatar', [api.about.html.image(id)]),
              h('div.main', [
                h('div.name', [ api.about.obs.name(id) ])
              ])
            ])
          })
        ])
      )
    ]
  }

  function PubList (ids) {
    return [
      h('h2.PeerList', [
        'Servers',
        when(computed(ids, x => x.length),
          h('button', {
            'ev-click': api.invite.sheet,
            classList: [
              when(computed(ids, x => x.length >= 3), '-mildpub'),
              when(computed(ids, x => x.length < 3), '-pub'),
            ]
          }, '+ Join Server')
        )
      ]),
      h('div', {
        classList: 'ProfileList'
      }, [
        when(computed(ids, x => x.length === 0),
          h('button -pub -full', {
            'ev-click': api.invite.sheet
          }, '+ Join Server')
        ),
        map(ids, (id) => {
          return h('a.profile', {
            classList: [ '-connected' ],
            href: id
          }, [
            h('div.avatar', [api.about.html.image(id)]),
            h('div.main', [
              h('div.name', [ api.about.obs.name(id) ])
            ]),
            h('div.progress', [
              api.progress.html.peer(id)
            ])
          ])
        })
      ])
    ]
  }

  function LocalPeerList (ids) {
    return [
      when(computed(ids, x => x.length), h('h2', 'Around you')),
      h('div', {
        classList: 'ProfileList'
      }, [
        map(ids, (id) => {
          return h('a.profile', {
            classList: [ '-connected' ],
            href: id
          }, [
            h('div.avatar', [api.about.html.image(id)]),
            h('div.main', [
              h('div.name', [ api.about.obs.name(id) ])
            ]),
            h('div.progress', [
              api.progress.html.peer(id)
            ])
          ])
        })
      ])
    ]
  }

  function subscribe (id) {
    api.message.async.publish({
      type: 'channel',
      channel: id,
      subscribed: true
    })
  }

  function unsubscribe (id) {
    api.message.async.publish({
      type: 'channel',
      channel: id,
      subscribed: false
    })
  }

  function tab (name, view) {
    var instance = views.get(view)
    return h('a', {
      'ev-click': function (ev) {
        if (instance.pendingUpdates && instance.pendingUpdates() && instance.reload) {
          instance.reload()
        }
      },
      href: view,
      classList: [
        when(selected(view), '-selected')
      ]
    }, [
      name,
      when(instance.pendingUpdates, [
        ' (', instance.pendingUpdates, ')'
      ])
    ])
  }

  function selected (view) {
    return computed([views.currentView, view], (currentView, view) => {
      return currentView === view
    })
  }
}

function overrideConfig (config) {
  return {
    'patchwork/config': {
      gives: nest('config.sync.load'),
      create: function (api) {
        return nest('config.sync.load', () => config)
      }
    }
  }
}

function addCommand (id, cb) {
  return {
    [`patchwork/command/${id}`]: {
      gives: nest(id),
      create: function (api) {
        return nest(id, cb)
      }
    }
  }
}

function arrayEq (a, b) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a !== b) {
    return a.every((value, i) => value === b[i])
  }
}