var { h, when } = require('mutant')
var nest = require('depnest')

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

    const currentTheme = api.settings.obs.get('patchwork.theme')
    const currentLang = api.settings.obs.get('patchwork.lang')
    const locales = api.intl.sync.locales()
    const localeNameLookup = api.intl.sync.localeNames()
    const currentFontSize = api.settings.obs.get('patchwork.fontSize')
    const fontSizes = ['8px', '10px', '12px', '14px', '16px', '18px', '20px']
    const filterFollowing = api.settings.obs.get('filters.following')

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
              style: {
                'font-size': '120%'
              },
              value: when(currentTheme, currentTheme, 'light'),
              'ev-change': (ev) => api.settings.sync.set({
                patchwork: {theme: ev.target.value}
              })
            }, [
              themeNames.map(name => h('option', {value: name}, [name]))
            ])
          ]),

          h('section', [
            h('h2', i18n('Language')),
            h('select', {
              style: {
                'font-size': '120%'
              },
              value: when(currentLang, currentLang, 'en'),
              'ev-change': (ev) => api.settings.sync.set({
                patchwork: {lang: ev.target.value}
              })
            }, [
              locales.map(code => h('option', {value: code}, [
                '[', code, '] ', getLocaleName(code)
              ]))
            ])
          ]),

          h('section', [
            h('h2', i18n('Font Size')),
            h('select', {
              style: {
                'font-size': '120%'
              },
              value: when(currentFontSize, currentFontSize, ''),
              'ev-change': (ev) => api.settings.sync.set({
                patchwork: {fontSize: ev.target.value}
              })
            }, [
              h('option', {value: ''}, 'Default'),
              fontSizes.map(size => h('option', {value: size}, size))
            ])
          ]),

          h('section', [
            h('h2', i18n('Filters')),
            h('label', [
              h('input', {
                type: 'checkbox',
                checked: filterFollowing,
                'ev-change': (ev) => api.settings.sync.set({
                  filters: {following: ev.target.checked}
                })
              }), i18n(' Hide following messages')
            ])
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
