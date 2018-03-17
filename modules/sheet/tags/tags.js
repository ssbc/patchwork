var {h, computed, Value} = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'sheet.display': 'first',
  'sheet.tags.renderTags': 'first',
  'sheet.tags.renderTaggers': 'first',
})

exports.gives = nest('sheet.tags.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const displayTags = Value(true)
  const selectedTag = Value()
  return nest('sheet.tags.render', function (msgId, ids) {
    api.sheet.display(close => {
      const content = computed([displayTags, selectedTag], (display, tag) => {
        if (display) {
          return api.sheet.tags.renderTags(ids, id => {
            selectedTag.set(id)
            displayTags.set(false)
          })
        } else {
          return api.sheet.tags.renderTaggers(msgId, tag)
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
}
