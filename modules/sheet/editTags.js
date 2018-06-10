const nest = require('depnest')
const { h, Value, map, computed, Array: MutantArray } = require('mutant')
const concat = require('lodash/concat')
const filter = require('lodash/filter')
const forEach = require('lodash/forEach')
const addSuggest = require('suggest-box')
const TagHelper = require('scuttle-tag')

exports.gives = nest('sheet.editTags')

exports.needs = nest({
  'about.obs.name': 'first',
  'keys.sync.id': 'first',
  'sbot.obs.connection': 'first',
  'sheet.display': 'first',
  'tag.html.tag': 'first'
})

exports.create = function (api) {
  return nest({ 'sheet.editTags': editTags })

  function editTags ({ msgId }, cb) {
    const ScuttleTag = TagHelper(api.sbot.obs.connection)
    const HtmlTag = api.tag.html.tag

    cb = cb || function () {}

    api.sheet.display(function (close) {
      const { content, onMount, onSave } = edit({ msgId }, cb)

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

    function edit ({ msgId }, cb) {
      const tagsToCreate = MutantArray([])
      const tagsToApply = MutantArray([])
      const tagsToRemove = MutantArray([])
      const tagsInput = Value('')

      const myId = api.keys.sync.id()
      const messageTags = map(ScuttleTag.obs.messageTagsFrom(msgId, myId), tagId =>
        ScuttleTag.obs.Tag(tagId, api.about.obs.name))
      const filteredMessages = computed([messageTags, tagsToRemove], (tags, removedIds) =>
        filter(tags, tag => !removedIds.includes(tag.tagId)))

      const messageTagsView = map(filteredMessages, tag =>
        computed(tag, t => HtmlTag(t, () => tagsToRemove.push(t.tagId))))
      const tagsToApplyView = map(tagsToApply, tag =>
        HtmlTag(tag, () => tagsToApply.delete(tag)))
      const tagsToCreateView = map(tagsToCreate, tag =>
        HtmlTag({ tagName: tag, tagId: 'new' }, () => tagsToCreate.delete(tag)))
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
        addSuggest(input, (inputText, cb) => {
          cb(null, getTagSuggestions(inputText))
        }, { cls: 'ConfirmSuggest' })
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
        const index = tagsToRemove().indexOf(tagId)
        if (index >= 0) {
          tagsToRemove.deleteAt(index)
        } else {
          tagsToApply.push({ tagId, tagName: value })
        }
      }

      function getTagSuggestions (word) {
        const suggestions = map(ScuttleTag.obs.allTags(), tagId => {
          const tagName = api.about.obs.name(tagId)()
          return {
            title: tagName,
            value: tagName,
            tagId
          }
        })()
        const appliedTagIds = map(filteredMessages, tag => tag.tagId)
        const applyTagIds = map(tagsToApply, tag => tag.tagId)
        const stagedTagIds = computed([ appliedTagIds, applyTagIds ], (a, b) => concat(a, b))()
        const filteredSuggestions = filter(suggestions, tag => !stagedTagIds.includes(tag.tagId))
        filteredSuggestions.push({ title: 'Press , to create a new tag' })
        return filteredSuggestions
      }

      function onSave () {
        // tagsToCreate
        forEach(tagsToCreate(), tag => {
          ScuttleTag.async.create(null, (err, msg) => {
            if (err) return
            ScuttleTag.async.name({ tag: msg.key, name: tag }, cb)
            ScuttleTag.async.apply({ tagged: true, message: msgId, tag: msg.key }, cb)
          })
        })
        // tagsToApply
        forEach(tagsToApply(),
          tag => ScuttleTag.async.apply({ tagged: true, message: msgId, tag: tag.tagId }, cb))
        // tagsToRemove
        forEach(tagsToRemove(),
          tagId => ScuttleTag.async.apply({ tagged: false, message: msgId, tag: tagId }, cb))
      }
    }
  }
}
