var { h } = require('mutant')
var nest = require('depnest')
var packageInfo = require('../../../../package.json')

var themeNames = Object.keys(require('../../../../styles'))

exports.needs = nest({
  'settings.obs.get': 'first',
  'settings.sync.set': 'first',
  'intl.sync.locales': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.localeNames': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/settings') return
    const i18n = api.intl.sync.i18n

    const locales = api.intl.sync.locales()
    const localeNameLookup = api.intl.sync.localeNames()
    const fontSizes = ['8px', '10px', '12px', '14px', '16px', '18px', '20px']

    const theme = api.settings.obs.get('patchwork.theme', 'light')
    const lang = api.settings.obs.get('patchwork.lang', '')
    const fontSize = api.settings.obs.get('patchwork.fontSize', '')
    const filterFollowing = api.settings.obs.get('filters.following')
    const filterSubscriptions = api.settings.obs.get('filters.subscriptions')
    const onlySubscribed = api.settings.obs.get('filters.onlySubscribed')
    const filterChannelViewSubscriptions = api.settings.obs.get('filters.channelView.subscriptions')

    var prepend = [
      h('PageHeading', [
        h('h1', [
          h('strong', i18n('Settings'))
        ])
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.content', [

          h('section', [
            h('h2', i18n('Theme')),
            h('select', {
              style: { 'font-size': '120%' },
              value: theme,
              'ev-change': (ev) => theme.set(ev.target.value)
            }, [
              themeNames.map(name => h('option', {value: name}, [name]))
            ])
          ]),

          h('section', [
            h('h2', i18n('Language')),
            h('select', {
              style: { 'font-size': '120%' },
              value: lang,
              'ev-change': (ev) => lang.set(ev.target.value)
            }, [
              h('option', {value: ''}, i18n('Default')),
              locales.map(code => h('option', {value: code}, [
                '[', code, '] ', getLocaleName(code)
              ]))
            ])
          ]),

          h('section', [
            h('h2', i18n('Font Size')),
            h('select', {
              style: { 'font-size': '120%' },
              value: fontSize,
              'ev-change': (ev) => fontSize.set(ev.target.value)
            }, [
              h('option', {value: ''}, i18n('Default')),
              fontSizes.map(size => h('option', {value: size}, size))
            ])
          ]),

          h('section', [
            h('h2', i18n('Public Feed Options')),

            h('div', [
              checkbox(filterFollowing, {
                label: i18n('Hide following messages')
              })
            ]),

            h('div', [
              checkbox(filterSubscriptions, {
                label: i18n('Hide channel subscription messages')
              })
            ]),

            h('div', [
              checkbox(onlySubscribed, {
                label: i18n(`Hide posts in channels that are not subscribed`)
              })
            ])
          ]),

          h('section', [
            h('h2', i18n('Channel Feed Options')),

            h('div', [
              checkbox(filterChannelViewSubscriptions, {
                label: i18n('Hide channel subscription messages')
              })
            ])
          ]),

          h('section', [
            h('h2', i18n('Information')),

            h('p', `${packageInfo.productName} ${packageInfo.version}`)
          ])
        ])
      ])
    ])

    function getLocaleName (code) {
      var translated = i18n(code)
      var name = localeNameLookup[code]

      if (name !== translated && code !== translated) {
        return `${name} (${translated})`
      } else {
        return name
      }
    }
  })
}

function checkbox (param, {label}) {
  return h('label', [
    h('input', {
      type: 'checkbox',
      checked: param,
      'ev-change': (ev) => param.set(ev.target.checked)
    }), ' ', label
  ])
}
