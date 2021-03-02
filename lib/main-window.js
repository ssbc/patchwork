const combine = require('depject')
const entry = require('depject/entry')
const electron = require('electron')
const h = require('mutant/h')
const when = require('mutant/when')
const onceTrue = require('mutant/once-true')
const computed = require('mutant/computed')
const catchLinks = require('./catch-links')
const themes = require('../styles')
const nest = require('depnest')
const LatestUpdate = require('./latest-update')
const ref = require('ssb-ref')
const watch = require('mutant/watch')
const requireStyle = require('require-style')
const ssbUri = require('ssb-uri')
const pull = require('pull-stream')
const moment = require('moment-timezone')
const fullscreen = require('./fullscreen.js')
const appViews = require('./app/views.js')
const getGitHandler = require('./app/sync/external-handler/git')

const localTimezone = moment.tz.guess()
moment.tz.setDefault(localTimezone)

module.exports = function (config) {
  const sockets = combine(
    overrideConfig(config),
    addCommand('app.navigate', navigate),
    require('./depject'),
    require('patch-settings')
  )

  const api = entry(sockets, nest({
    'config.sync.load': 'first',
    'keys.sync.id': 'first',
    'sbot.obs.connection': 'first',
    'sbot.async.get': 'first',
    'blob.sync.url': 'first',
    'page.html.render': 'first',
    'app.html.search': 'first',
    'app.html.channels': 'first',
    'app.html.progressNotifier': 'first',
    'about.async.latestValues': 'first',
    'profile.sheet.edit': 'first',
    'profile.html.preview': 'first',
    'app.navigate': 'first',
    'app.linkPreview': 'first',
    'channel.obs.subscribed': 'first',
    'settings.obs.get': 'first',
    'intl.sync.i18n': 'first',
    'contact.obs.blocking': 'first'
  }))

  const i18n = api.intl.sync.i18n
  const language = api.settings.obs.get('patchwork.lang', '')()
  moment.locale(language)

  const id = api.keys.sync.id()
  const latestUpdate = LatestUpdate()
  const subscribedChannels = api.channel.obs.subscribed(id)
  const includeParticipating = api.settings.obs.get('patchwork.includeParticipating', false)
  const autoDeleteBlocked = api.settings.obs.get('patchwork.autoDeleteBlocked', false)

  // prompt to setup profile on first use
  onceTrue(api.sbot.obs.connection, (ssb) => {
    ssb.latestSequence(api.keys.sync.id(), (err, key) => {
      if (err) {
        // This may throw an error if the feed doesn't have any messages, but
        // that shouldn't cause any problems so this error can be ignored.
      }

      if (key == null) {
        api.profile.sheet.edit({ usePreview: false })
      }
    })

    const currentlyDeleting = {}

    watch(api.contact.obs.blocking(id), (blocking) => {
      if (autoDeleteBlocked() !== true) return
      if (blocking.length === 0) return

      if (ssb.del == null) return

      blocking
        .filter(feedId => feedId !== ssb.id)
        .forEach(feed => {
          pull(
            ssb.createUserStream({ id: feed }),
            pull.asyncMap((msg, cb) => {
              const key = msg.key
              if (currentlyDeleting[key] === true) {
                return cb(null, null) // already deleting
              }

              currentlyDeleting[key] = true

              ssb.del(key, (err) => {
                currentlyDeleting[key] = false
                cb(err, key)
              })
            }),
            pull.filter(),
            pull.collect((err, keys) => {
              if (err) {
                console.error(keys)
                throw err
              }

              if (keys.length > 0) {
                console.log(`deleted ${keys.length} messages from blocked authors`)
              }
            })
          )
        })
    })
  })

  const defaultViews = computed(includeParticipating, (includeParticipating) => {
    const result = [
      '/public', '/private', '/mentions'
    ]

    // allow user to choose in settings whether to show participating tab
    if (includeParticipating) {
      result.push('/participating')
    }

    return result
  })

  const views = appViews(api.page.html.render, defaultViews)

  const pendingCount = views.get('/mentions').pendingUpdates

  watch(pendingCount, count => {
    electron.ipcRenderer.invoke('badgeCount', count)
  })

  electron.ipcRenderer.on('goForward', views.goForward)
  electron.ipcRenderer.on('goBack', views.goBack)

  electron.ipcRenderer.on('goToSettings', () => api.app.navigate('/settings'))

  electron.ipcRenderer.on("navigate-to", (ev, target) => {
    navigate(target);
  });

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.theme', 'light'), themeName => {
        return themes[themeName] || themes.light
      })
    })
  )

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.theme', 'light'), themeName => {
        const syntaxThemeOptions = {
          light: 'github',
          dark: 'monokai',
          dracula: 'dracula'
        }

        const syntaxTheme = syntaxThemeOptions[themeName] || syntaxThemeOptions.light
        return requireStyle(`highlight.js/styles/${syntaxTheme}.css`)
      })
    })
  )

  document.head.appendChild(
    h('style', {
      innerHTML: requireStyle('noto-color-emoji')
    })
  )

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.fontSize'), size => {
        if (size) {
          return 'html, body {font-size: ' + size + ';}'
        }
      })
    })
  )

  document.head.appendChild(
    h('style', {
      innerHTML: computed(api.settings.obs.get('patchwork.fontFamily'), family => {
        if (family) {
          return 'body, input, select { font-family: ' + family + ';}'
        }
      })
    })
  )

  const container = h(`MainWindow -${process.platform}`, {
    classList: [when(fullscreen(), '-fullscreen')],
    'ev-dragover': preventDefault,
    'ev-drop': preventDefault,
    'ev-dragstart': preventDefaultUnlessImage
  }, [
    h('div.top', [
      h('span.history', [
        h('a', {
          'ev-click': views.goBack,
          classList: [when(views.canGoBack, '-active')]
        }),
        h('a', {
          'ev-click': views.goForward,
          classList: [when(views.canGoForward, '-active')]
        })
      ]),
      h('span.nav', [
        tab(i18n('Public'), '/public'),
        tab(i18n('Private'), '/private'),
        dropTab(i18n('More'))
      ]),
      h('span.appTitle', [
        h('span.title', i18n('Patchwork')),
        api.app.html.progressNotifier()
      ]),
      h('span', [api.app.html.search(api.app.navigate)]),
      h('span.nav', [
        tab(i18n('Profile'), id),
        computed(includeParticipating, (includeParticipating) => {
          if (includeParticipating) return tab(i18n('Participating'), '/participating')
        }),
        tab(i18n('Mentions'), '/mentions')
      ])
    ]),
    when(latestUpdate,
      h('div.info', [
        h('a.message -update', { href: 'https://github.com/ssbc/patchwork/releases/latest' }, [
          h('strong', ['Patchwork ', latestUpdate, i18n(' has been released.')]), i18n(' Click here to download and view more info!'),
          h('a.ignore', { 'ev-click': latestUpdate.ignore }, 'X')
        ])
      ])
    ),
    views.html
  ])

  const previewElement = api.app.linkPreview(container, 500)

  catchLinks(container, (href, external, anchor) => {
    if (!href) return
    if (external) {
      electron.shell.openExternal(href)
    } else {
      api.app.navigate(href, anchor)
    }
  })
  return [container, previewElement]

  // scoped

  function getSubscribedChannelMenu () {
    const channels = Array.from(subscribedChannels()).sort(localeCompare)

    if (channels.length) {
      return {
        type: 'submenu',
        label: i18n('Channels'),
        submenu: [
          {
            type: 'normal',
            label: i18n('Browse Recently Active'),
            target: '/channels'
          },
          { type: 'separator' }
        ].concat(channels.map(channel => ({
          type: 'normal',
          label: `#${channel}`,
          target: `#${channel}`,
        })))
      }
    } else {
      return {
        type: 'normal',
        label: i18n('Browse Channels'),
        target: '/channels',
      }
    }
  }

  function buildDropdownMenuItems() {
    const dropTabItems = [
      getSubscribedChannelMenu(),
      {
        type: 'submenu',
        label: i18n("Participating"),
        submenu: [
          {
            type: "normal",
            label: i18n("All Threads"),
            target: "/participating",
          },
          {
            type: "normal",
            label: i18n("Threads Started By You"),
            target: "/your-posts",
          },
        ],
      },
      {
        type: "submenu",
        label: i18n("Gatherings"),
        submenu: [
          {
            type: "normal",
            label: i18n("All"),
            target: "/gatherings",
          },
          {
            type: "normal",
            label: i18n("Attending"),
            target: "/attending-gatherings",
          },
        ],
      },
      {
        type: "normal",
        label: i18n("Tags"),
        target: `/tags/all/${encodeURIComponent(id)}`,
      },
      {
        type: "normal",
        label: i18n("Extended Network"),
        target: "/all",
      },
      { type: "separator" },
      {
        type: "normal",
        label: i18n("Settings"),
        target: "/settings",
      },
    ];
    return dropTabItems
  }

  function dropTab (title) {
    const element = h('a -drop', {
      'ev-click': () => {
        const dropTabItems = buildDropdownMenuItems()
        const rects = element.getBoundingClientRect()
        electron.ipcRenderer.invoke('navigation-menu-popup', {
          x: rects.left,
          y: rects.bottom,
          items: dropTabItems,
        })
      }
    }, title)
    return element
  }

  function navigate (href, anchor) {
    if (typeof href !== 'string') return false
    getExternalHandler(href, (err, handler) => {
      if (!err && handler) {
        handler(href)
      } else {
        if (href.startsWith('ssb:')) {
          try {
            href = ssbUri.toSigilLink(href)
          } catch (e) {
            // error can be safely ignored
            // it just means this isn't an SSB URI
          }
        }

        // no external handler found, use page.html.render
        previewElement.cancel()
        views.setView(href, anchor)
      }
    })
  }

  function getExternalHandler (href, cb) {
    const link = ref.parseLink(href)
    if (link && ref.isMsg(link.link)) {
      const params = { id: link.link }
      if (link.query && link.query.unbox) {
        params.private = true
        params.unbox = link.query.unbox
      }
      api.sbot.async.get(params, function (err, value) {
        if (err) return cb(err)
        cb(null, getGitHandler({ key: link.link, value, query: link.query }))
      })
    } else if (link && ref.isBlob(link.link)) {
      cb(null, function (href) {
        electron.shell.openExternal(api.blob.sync.url(href))
      })
    } else {
      cb()
    }
  }

  function tab (name, view) {
    const instance = views.get(view)
    return h('a', {
      'ev-click': function () {
        const instance = views.get(view)
        const isSelected = views.currentView() === view
        const needsRefresh = instance && instance.pendingUpdates && instance.pendingUpdates()

        // refresh if tab is clicked when there are pending items or the page is already selected
        if ((needsRefresh || isSelected) && instance.reload) {
          instance.reload()
        }
      },
      href: view,
      classList: [
        when(selected(view), '-selected')
      ]
    }, [
      name,
      instance
        ? when(instance.pendingUpdates, [' (', instance.pendingUpdates, ')'])
        : null
    ])
  }

  function selected (view) {
    return computed([views.currentView, view], (currentView, view) => {
      return currentView === view
    })
  }

  function getMessageText (id, cb) {
    api.sbot.async.get(id, (err, value) => {
      if (err) return cb(err)
      if (value.content.type === 'gathering') {
        api.about.async.latestValues(id, ['title', 'description'], (err, values) => {
          if (err) return cb(err)
          const text = `# ${values.title}\n\n${values.description}`
          cb(null, text)
        })
      } else {
        cb(null, value.content.text)
      }
    })
  }
}

function overrideConfig (config) {
  return {
    'patchwork/config': {
      gives: nest('config.sync.load'),
      create: function () {
        return nest('config.sync.load', () => config)
      }
    }
  }
}

function addCommand (id, cb) {
  return {
    [`patchwork/command/${id}`]: {
      gives: nest(id),
      create: function () {
        return nest(id, cb)
      }
    }
  }
}

function localeCompare (a, b) {
  return a.localeCompare(b)
}

function preventDefault (ev) {
  ev.preventDefault()
}

function preventDefaultUnlessImage (ev) {
  if (ev.target.nodeName !== 'IMG') {
    ev.preventDefault()
  }
}
