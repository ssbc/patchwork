var {h, when, map, computed, Value, lookup} = require('mutant')
var nest = require('depnest')
var catchLinks = require('../../lib/catch-links')

exports.needs = nest({
  'sheet.display': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'contact.html.followToggle': 'first',
  'profile.obs.rank': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'app.navigate': 'first',
  'intl.sync.i18n': 'first',
  'tag.obs.messageTaggers': 'first'
})

exports.gives = nest('sheet.tags')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const displayTags = Value(true)
  const selectedTag = Value()
  return nest('sheet.tags', function (msgId, ids) {
    api.sheet.display(close => {
      const content = computed([displayTags, selectedTag], (displayTags, selectedTag) => {
        if (displayTags) {
          return renderTags(ids)
        } else {
          return renderTaggers(msgId, selectedTag)
        }
      })
      const back = computed(displayTags, (display) => {
        if (display) {
          return
        } else {
          return h('button -close', {
            'ev-click': () => {
              displayTags.set(true)
              selectedTag.set()
            }
          }, i18n('Back'))
        }
      })
      return {
        content,
        footer: [
          back,
          h('button -close', {
            'ev-click': () => {
              close()
              displayTags.set(true)
              selectedTag.set()
            }
          }, i18n('Close'))
        ]
      }
    })
  })

  function renderTags (ids) {
    var currentFilter = Value()
    var tagLookup = lookup(ids, (id) => {
      return [id, api.about.obs.name(id)]
    })
    var filteredIds = computed([ids, tagLookup, currentFilter], (ids, tagLookup, filter) => {
      if (filter) {
        var result = []
        for (var k in tagLookup) {
          if ((tagLookup[k] && tagLookup[k].toLowerCase().includes(filter.toLowerCase())) || k === filter) {
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
        i18n('Applied Tags'),
        h('input', {
          type: 'search',
          placeholder: 'filter tags',
          'ev-input': function (ev) {
            currentFilter.set(ev.target.value)
          },
          hooks: [FocusHook()],
          style: {
            'float': 'right',
            'font-size': '100%'
          }
        })
      ]),
      renderTagBlock(filteredIds)
    ])

    catchLinks(content, (href, external, anchor) => {
      if (!external) {
        api.app.navigate(href, anchor)
        close()
      }
    })

    return content
  }

  function renderTagBlock (tags) {
    var yourId = api.keys.sync.id()
    return [
      h('div', {
        classList: 'TagList'
      }, [
        map(tags, (id) => {
          return h('a.tag', {
            href: `/tags/${id}`,
            title: id
          }, [
            h('div.main', [
              h('div.name', [ api.about.obs.name(id) ])
            ]),
            h('div.buttons', [
              h('a.ToggleButton', {
                'ev-click': () => {
                  selectedTag.set(id)
                  displayTags.set(false)
                }
              }, i18n('View Taggers'))
            ])
          ])
        }, { idle: true, maxTime: 2 })
      ])
    ]
  }

  function renderTaggers (msgId, tagId) {
    var taggerIds = api.tag.obs.messageTaggers(msgId, tagId)
    var currentFilter = Value()
    var taggerLookup = lookup(taggerIds, (id) => {
      return [id, api.about.obs.name(id)]
    })
    var filteredIds = computed([taggerIds, taggerLookup, currentFilter], (ids, taggerLookup, filter) => {
      if (filter) {
        var result = []
        for (var k in taggerLookup) {
          if ((taggerLookup[k] && taggerLookup[k].toLowerCase().includes(filter.toLowerCase())) || k === filter) {
            result.push(k)
          }
        }
        return result
      } else {
        return ids
      }
    })
    return h('div', {
      style: { padding: '20px' }
    }, [
      h('h2', {
        style: { 'font-weight': 'normal' }
      }, [
        api.about.obs.name(tagId),
        i18n(' Taggers'),
        h('input', {
          type: 'search',
          placeholder: 'filter names',
          'ev-input': function (ev) {
            currentFilter.set(ev.target.value)
          },
          hooks: [FocusHook()],
          style: {
            'float': 'right',
            'font-size': '100%'
          }
        })
      ]),
      renderTaggersBlock(filteredIds)
    ])
  }

  function renderTaggersBlock (profiles) {
    var yourId = api.keys.sync.id()
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