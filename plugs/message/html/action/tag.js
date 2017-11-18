var { h, computed, map, Set } = require('mutant')
var nest = require('depnest')
var addSuggest = require('suggest-box')

exports.needs = nest({
  'about.obs.groupedValues': 'first',
  'about.obs.valueFrom': 'first',
  'about.sync.suggestTags': 'first',
  'intl.sync.i18n': 'first',
  'keys.sync.id': 'first',
  'profile.html.person': 'first',
  'sbot.async.publish': 'first',
  'sheet.display': 'first'
})

exports.gives = nest('message.html.action')

exports.create = (api) => {
  var i18n = api.intl.sync.i18n

  return nest('message.html.action', function tag (msg) {
    var id = api.keys.sync.id()
    return (
      h('a.tag', {
        href: '#',
        'ev-click': () => inputTags(msg, id)
      }, 'Tag')
    )
  })

  function inputTags (msg, id) {
    var getTagSuggestions = api.about.sync.suggestTags()
    var allTagsObs = api.about.obs.groupedValues(msg.key, 'tag')
    var allTagNamesObs = computed([allTagsObs], Object.keys)
    var myCurrentTags = api.about.obs.valueFrom(msg.key, 'tag', id)
    var myTagsObs = Set(myCurrentTags())

    // open sheet to read and write tags
    api.sheet.display(function (done) {

      var nextTagInput = h('input', {
        type: 'text',
        placeholder: i18n('tag'),
        'ev-suggestselect': (ev) => {
          myTagsObs.add(ev.detail.value)
          nextTagInput.value = ''
        }
      })

      setImmediate(() => {
        addSuggest(nextTagInput, (inputText, cb) => {
          cb(null, getTagSuggestions(inputText))
        }, {
          cls: 'SuggestBox'
        })
      })

      var content = (
        h('div', [
          h('div', [
            nextTagInput,
            h('ul', [
              map(myTagsObs, function (tag) {
                return h('li', [
                  h('span', tag),
                  h('button', {
                    'ev-click': () => {
                      myTagsObs.delete(tag)
                    }
                  }, [
                    'x'
                  ])
                ])
              })
            ])
          ]),
          h('ul', [
            map(allTagNamesObs, function (tagName) {
              var taggers = computed([allTagsObs], (tags) => tags[tagName])
              return (
                h('li', [
                  h('h2', tagName),
                  h('ul', [
                    map(taggers, (taggerId) => {
                      return api.profile.html.person(taggerId)
                    })
                  ])
                ])
              )
            })
          ])
        ])
      )
      const footer = [
        h('button', {
          'ev-click': () => {
            publishTag(msg, myTagsObs())
            done()
          }
        }, [
          'tag'
        ]),
        h('button', {
          'ev-click': () => {
            done()
          }
        }, [
          'cancel'
        ])
      ]
      return { content, footer }
    })
  }

  function publishTag (msg, tag) {
    var content = {
      type: 'about',
      about: msg.key,
      tag
    }
    if (msg.value.content.recps) {
      content.recps = msg.value.content.recps.map(function (e) {
        return e && typeof e !== 'string' ? e.link : e
      })
      content.private = true
    }
    api.sbot.async.publish(content)
  }
}
