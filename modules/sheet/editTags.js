const nest = require('depnest')
const { h, Value, map, computed, Array: MutantArray } = require('mutant')
const concat = require('lodash/concat')
const filter = require('lodash/filter')
const parallel = require('run-parallel')
const addSuggest = require('suggest-box')
const TagHelper = require('scuttle-tag')

exports.gives = nest('sheet.editTags')

exports.needs = nest({
  'about.obs.name': 'first',
  'keys.sync.id': 'first',
  'sbot.obs.connection': 'first',
  'sheet.display': 'first',
  'tag.async.suggest': 'first',
  'tag.html.tag': 'first'
})

exports.create = function (api) {
  return nest({ 'sheet.editTags': editTags })

  function editTags ({ msgId }, callback) {
    const ScuttleTag = TagHelper(api.sbot.obs.connection)
    const HtmlTag = api.tag.html.tag

    callback = callback || function () {}

    api.sheet.display(function (close) {
      const { content, onMount, onSave } = edit({ msgId })

      return {
        content,
        footer: [
          h('button.save', { 'ev-click': publish }, 'Save'),
          h('button.cancel', { 'ev-click': close }, 'Cancel')
        ],
        onMount
      }

      function publish () {
        close()
        onSave()
      }
    })

    function edit ({ msgId }) {
      const tagsToCreate = MutantArray([])
      const tagsToApply = MutantArray([])
      const tagsToRemove = MutantArray([])
      const tagsInput = Value('')

      const myId = api.keys.sync.id()
      const messageTags = ScuttleTag.obs.messageTagsFrom(msgId, myId)
      const filteredTags = computed([messageTags, tagsToRemove], (tagIds, removedIds) =>
        filter(tagIds, tagId => !removedIds.includes(tagId)))

      const messageTagsView = map(filteredTags, tagId =>
        HtmlTag(tagId, { onRemove: () => tagsToRemove.push(tagId) }))
      const tagsToApplyView = map(tagsToApply, tagId =>
        HtmlTag(tagId, { onRemove: () => tagsToApply.delete(tagId) }))
      const tagsToCreateView = map(tagsToCreate, tag =>
        HtmlTag('new', { nameFn: () => tag, onRemove: () => tagsToCreate.delete(tag) }))
      const stagedTags = computed([messageTagsView, tagsToApplyView, tagsToCreateView], (a, b, c) =>
        h('StagedTags', concat(a, [b, c])))

      const input = h('input.tags', {
        placeholder: 'Add tags here',
        'ev-keyup': onInput,
        value: tagsInput()
      })

      input.addEventListener('suggestselect', onSuggestSelect)

      return {
        content: [stagedTags, h('EditTags', input)],
        onMount,
        onSave
      }

      function onMount () {
        input.focus()
        const stagedTagIds = computed([ filteredTags, tagsToApply ], (a, b) => concat(a, b))
        const getTagSuggestions = api.tag.async.suggest(stagedTagIds)
        addSuggest(input, (inputText, cb) => {
          getTagSuggestions(inputText, cb)
        }, { cls: 'SuggestBox' })
      }

      function onInput (e) {
        const input = e.target.value
        if (!input.endsWith(',')) {
          tagsInput.set(input)
          return
        }
        const tag = input.substring(0, input.length - 1)
        tagsToCreate.push(tag)
        e.target.value = ''
      }

      function onSuggestSelect (e) {
        e.target.value = ''
        const { value, tagId } = e.detail
        if (!tagId) {
          tagsToCreate.push(value)
          return
        }
        const index = tagsToRemove().indexOf(tagId)
        if (index >= 0) {
          tagsToRemove.deleteAt(index)
        } else {
          tagsToApply.push(tagId)
        }
      }

      function onSave () {
        parallel(
          concat(
            tagsToCreate().map(tag => cb => createNameAndApplyTag(tag, cb)),
            tagsToApply().map(tagId => cb => ScuttleTag.async.apply({
              tagged: true,
              message: msgId,
              tag: tagId
            }, cb)),
            tagsToRemove().map(tagId => cb => ScuttleTag.async.apply({
              tagged: false,
              message: msgId,
              tag: tagId
            }, cb))
          ),
          callback
        )
      }
    }

    function createNameAndApplyTag (tag, callback) {
      ScuttleTag.async.create(null, (err, msg) => {
        if (err) {
          callback(err)
          return
        }
        parallel([
          cb => ScuttleTag.async.name({
            tag: msg.key,
            name: tag
          }, cb),
          cb => ScuttleTag.async.apply({
            tagged: true,
            message: msgId,
            tag: msg.key
          }, cb)
        ], callback)
      })
    }
  }
}
