var {h, when, map, computed} = require('mutant')
var nest = require('depnest')
var catchLinks = require('../../../lib/catch-links')

exports.needs = nest({
  'sheet.display': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'profile.obs.rank': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'app.navigate': 'first'
})

exports.gives = nest('message.sheet.likes')

exports.create = function (api) {
  return nest('message.sheet.likes', function (ids) {
    api.sheet.display(close => {
      var content = h('div', {
        style: { padding: '20px' }
      }, [
        h('h2', {
          style: { 'font-weight': 'normal' }
        }, ['Liked by']),
        renderContactBlock(ids)
      ])

      catchLinks(content, (href, external) => {
        if (!external) {
          api.app.navigate(href)
          close()
        }
      })

      return {
        content,
        footer: [
          h('button -close', {
            'ev-click': close
          }, 'Close')
        ]
      }
    })
  })

  function renderContactBlock (profiles) {
    var yourId = api.keys.sync.id()
    var yourFollows = api.contact.obs.following(yourId)
    profiles = api.profile.obs.rank(profiles)
    return [
      h('div', {
        classList: 'ProfileList'
      }, [
        map(profiles, (id) => {
          var following = computed(yourFollows, f => f.has(id))
          return h('a.profile', {
            href: id,
            classList: [
              when(following, '-following')
            ]
          }, [
            h('div.avatar', [api.about.html.image(id)]),
            h('div.main', [
              h('div.name', [ api.about.obs.name(id) ])
            ])
          ])
        }, { idle: true })
      ])
    ]
  }
}
