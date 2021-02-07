const { h, map, computed, Value, lookup } = require('mutant')
const nest = require('depnest')
const catchLinks = require('../../catch-links')
const displaySheet = require('../../sheet/display')

exports.needs = nest({
  'contact.html.followToggle': 'first',
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
    displaySheet(close => {
      const currentFilter = Value()
      const nameLookup = lookup(ids, (id) => {
        return [id, api.about.obs.name(id)]
      })
      const filteredIds = computed([ids, nameLookup, currentFilter], (ids, nameLookup, filter) => {
        if (filter) {
          const result = []
          for (const k in nameLookup) {
            if ((nameLookup[k] && nameLookup[k].toLowerCase().includes(filter.toLowerCase())) || k === filter) {
              result.push(k)
            }
          }
          return result
        } else {
          return ids
        }
      })
      const content = h('div', {
        style: { padding: '20px' }
      }, [
        h('h2', {
          style: { 'font-weight': 'normal' }
        }, [
          title,
          h('input', {
            type: 'search',
            classList: 'search',
            placeholder: i18n('filter names'),
            'ev-input': function (ev) {
              currentFilter.set(ev.target.value)
            },
            hooks: [FocusHook()],
            style: {
              float: 'right',
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
    profiles = api.profile.obs.rank(profiles)
    return [
      h('div', {
        classList: 'ProfileList'
      }, [
        map(profiles, (id) => {
          return h('a.profile', {
            href: id,
            title: id
          }, [
            h('div.avatar', [api.about.html.image(id)]),
            h('div.main', [
              h('div.name', [api.about.obs.name(id)])
            ]),
            h('div.buttons', [
              api.contact.html.followToggle(id, { block: false })
            ])
          ])
        }, { nextTime: true, maxTime: 10 })
      ])
    ]
  }
}

function FocusHook () {
  return function (element) {
    setTimeout(() => {
      element.focus()
      element.select()
    }, 5)
  }
}
