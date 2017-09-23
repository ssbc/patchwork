var { h, computed } = require('mutant')
var nest = require('depnest')

var themeNames = Object.keys(require('../../../../styles'))

exports.needs = nest({
  'settings.obs.get': 'first',
  'settings.sync.set': 'first',
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/settings') return

    const currentTheme = api.settings.obs.get('patchwork.theme')
    const filterFollowing = api.settings.obs.get('filters.following')

    var prepend = [
      h('PageHeading', [
        h('h1', [
          h('strong', 'Settings')
        ])
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.content', [
          h('section', [
            h('h2', 'Theme'),
            h('select', {
              style: {
                'font-size': '120%'
              },
              value: currentTheme,
              'ev-change': (ev) => api.settings.sync.set({
                patchwork: {theme: ev.target.value}
              })
            }, [
              themeNames.map(name => h('option', {value: name}, [name]))
            ])
          ]),
          h('section', [
            h('h2', 'Filters'),
            h('label', [
              h('input', {
                type: 'checkbox',
                checked: filterFollowing,
                'ev-change': (ev) => api.settings.sync.set({
                  filters: {following: ev.target.checked}
                })
              }), ' Hide following messages'
            ])
          ])
        ])
      ])
    ])
  })
}
