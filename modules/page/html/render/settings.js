var { h } = require('mutant')
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

    var id = api.keys.sync.id()
    var following = api.contact.obs.following(id)

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
            themeNames.map(name => {
              return h('button', {
                'ev-click': () => api.settings.sync.set({ theme: name })
              }, name)
            })
          ])
        ])
      ])
    ])
  })
}
