const nest = require('depnest')
const { h, Value, Struct, map, computed } = require('mutant')
const MutantArray = require('mutant/Array')
const concat = require('lodash/concat')
const filter = require('lodash/filter')
const zip = require('lodash/zip')
const forEach = require('lodash/forEach')
const addSuggest = require('suggest-box')

exports.gives = nest('sheet.editTags')

exports.needs = nest({
  'sheet.display': 'first',
  'tag.html.edit': 'first'
})

exports.create = function(api) {
  return nest({ 'sheet.editTags': editTags })

  function editTags({ msgId }, cb) {
    cb = cb || function() {}
    api.sheet.display(function (close) {
      const { content, onMount, onSave } = api.tag.html.edit({ msgId }, cb)

      return {
        content,
        footer: [
          h('button.save', { 'ev-click': publish }, 'Save'),
          h('button.cancel', { 'ev-click': close }, 'Cancel')
        ],
        mounted: onMount
      }

      function publish () {
        close()
        onSave()
      }
    })
  }
}