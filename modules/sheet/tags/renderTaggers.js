var { h, map, computed, Value, lookup } = require('mutant')
var nest = require('depnest')
var catchLinks = require('../../../lib/catch-links')

exports.needs = nest({
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'contact.html.followToggle': 'first',
  'intl.sync.i18n': 'first',
  'keys.sync.id': 'first',
  'profile.obs.rank': 'first',
  'tag.obs.messageTaggers': 'first',
})

exports.gives = nest('sheet.tags.renderTaggers')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('sheet.tags.renderTaggers', function (msgId, tagId) {
    var taggerIds = api.tag.obs.messageTaggers(msgId, tagId)
    var currentFilter = Value()
    var taggerLookup = lookup(taggerIds, (id) => {
      return [id, api.about.obs.name(id)]
    })
    var filteredIds = computed(
      [taggerIds, taggerLookup, currentFilter],
      (ids, taggerLookup, filter) => {
        if (filter) {
          var result = []
          for (var k in taggerLookup) {
            if (
              (taggerLookup[k] && taggerLookup[k].toLowerCase().includes(filter.toLowerCase())) ||
              k === filter
            ) {
              result.push(k)
            }
          }
          return result
        } else {
          return ids
        }
      }
    )
    return h('TaggersSheet', [
      h('h2', [
        api.about.obs.name(tagId),
        i18n(' Taggers'),
        h('input', {
          type: 'search',
          placeholder: 'filter names',
          'ev-input': ev => currentFilter.set(ev.target.value),
          hooks: [ FocusHook() ],
        })
      ]),
      renderTaggersList(filteredIds)
    ])
  })

  function renderTaggersList (profiles) {
    var yourId = api.keys.sync.id()
    profiles = api.profile.obs.rank(profiles)
    return [
      h('TaggersList', [
        map(profiles, (id) => {
          return h('a.profile', {
            href: id,
            title: id
          }, [
            h('div.avatar', [api.about.html.image(id)]),
            h('div.main', [
              h('div.name', [ api.about.obs.name(id) ])
            ]),
            h('div.buttons', [
              api.contact.html.followToggle(id, {block: false})
            ])
          ])
        }, { idle: true, maxTime: 2 })
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