const { h, computed, Value } = require('mutant')
const nest = require('depnest')
const catchLinks = require('../../../catch-links')
const displaySheet = require('../../../sheet/display')

exports.needs = nest({
  'app.navigate': 'first',
  'intl.sync.i18n': 'first',
  'sheet.tags.renderTags': 'first',
  'sheet.tags.renderTaggers': 'first'
})

exports.gives = nest('sheet.tags.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const displayTags = Value(true)
  const selectedTag = Value()
  return nest('sheet.tags.render', function (msgId, ids) {
    displaySheet(close => {
      const content = h('div',
        computed([displayTags, selectedTag], (display, tag) => {
          if (!display) return api.sheet.tags.renderTaggers(msgId, tag)
          return api.sheet.tags.renderTags(ids, id => {
            selectedTag.set(id)
            displayTags.set(false)
          })
        })
      )

      const back = computed(displayTags, (display) => {
        if (display) return
        return h('button -close', {
          'ev-click': () => {
            displayTags.set(true)
            selectedTag.set()
          }
        }, i18n('Back'))
      })

      catchLinks(content, (href, external, anchor) => {
        if (!external) {
          api.app.navigate(href, anchor)
          close()
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
