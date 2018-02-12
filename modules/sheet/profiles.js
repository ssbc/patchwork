var {h, when, map, computed, Value, lookup} = require('mutant')
var nest = require('depnest')
var catchLinks = require('../../lib/catch-links')

exports.needs = nest({
  'sheet.display': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'profile.obs.rank': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'app.navigate': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('sheet.profiles')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('sheet.profiles', function (ids, title) {
    api.sheet.display(close => {
      var currentFilter = Value()
      var nameLookup = lookup(ids, (id) => {
        return [id, api.about.obs.name(id)]
      })
      var filteredIds = computed([ids, nameLookup, currentFilter], (ids, nameLookup, filter) => {
        if (filter) {
          var result = []
          for (var k in nameLookup) {
            if (nameLookup[k] && nameLookup[k].toLowerCase().includes(filter.toLowerCase())) {
              result.push(k)
            }
          }
          return result
        } else {
          return ids
        }
      })
      var content = h('div', {
        style: { padding: '20px' }
      }, [
        h('h2', {
          style: { 'font-weight': 'normal' }
        }, [
          title,
          h('input', {
            type: 'search',
            placeholder: 'filter names',
            'ev-input': function (ev) {
              currentFilter.set(ev.target.value)
            },
            style: {
              'float': 'right',
              'font-size': '100%'
            }
          })
        ]),
        renderContactBlock(filteredIds)
      ])

      catchLinks(content, (href, external, anchor) => {
        if (!external) {
          api.app.navigate(href, anchor)
          close()
        }
      })

      return {
        content,
        footer: [
          h('button -close', {
            'ev-click': close
          }, i18n('Close'))
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
          var following = computed(yourFollows, f => f.includes(id))
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
        }, { idle: true, maxTime: 2 })
      ])
    ]
  }
}
