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
        ]),
      ])
    ]

    return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        h('section.content', [
          h('section', [
            h('h2', 'Theme'),
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
            })
          ]),
          h('section', [
            h('h2', 'Filters'),
            computed(filterFollowing, filter => {
              const style = filter
                ? { 'margin-right': '1rem', 'border-color': 'teal' }
                : { 'margin-right': '1rem' }

              return [
                h('button', {
                  'ev-click': () => api.settings.sync.set({
                    filters: {following: !filter}
                  }),
                  style
                }, filter ? 'Hide following messages' : 'Show following messages')
              ]
            })
          ])
        ])
      ])
    ])
  })
}
