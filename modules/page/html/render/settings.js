var { h, computed } = require('mutant')
var nest = require('depnest')
var appRoot = require('app-root-path')

var themeNames = Object.keys(require('../../../../styles'))

exports.needs = nest({
  'settings.obs.get': 'first',
  'settings.sync.set': 'first',
  'intl.sync.locales': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/settings') return
    const i18n = api.intl.sync.i18n
    
    const currentTheme = api.settings.obs.get('patchwork.theme')
    const currentLang = api.settings.obs.get('patchwork.lang')
    const langNames = api.intl.sync.locales()
    const filterFollowing = api.settings.obs.get('filters.following')

    var prepend = [
      h('PageHeading', [
        h('h1', [
          h('strong', i18n('Settings'))
        ]),
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.content', [
          h('section', [
            h('h2', i18n('Theme')),
            computed(currentTheme, currentTheme => {
              return themeNames.map(name => {
                const style = currentTheme == name
                  ? { 'margin-right': '1rem', 'border-color': 'teal' }
                  : { 'margin-right': '1rem' }

                return h('button', {
                  'ev-click': () => api.settings.sync.set({
                    patchwork: {theme: name}
                  }),
                  style
                }, name)
              })
            }, [
              themeNames.map(name => h('option', {value: name}, [name]))
            ])
          ]),
          h('section', [
            h('h2', i18n('Language')),
            computed(currentLang, currentLang => {
              return langNames.map(lang => {
                const style = currentLang == lang
                  ? { 'margin-right': '1rem', 'border-color': 'teal' }
                  : { 'margin-right': '1rem' }

                return h('button', {
                  'ev-click': () => api.settings.sync.set({
                    patchwork: {lang: lang}
                  }),
                  style
                }, lang)
              })
            })
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
  })
}
