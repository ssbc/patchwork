var nest = require('depnest')
var {map, computed, watch} = require('mutant')
const TagHelper = require('scuttle-tag')

exports.needs = nest({
  'about.obs.name': 'first',
  'intl.sync.startsWith': 'first',
  'keys.sync.id': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('tag.obs.suggest')

exports.create = function (api) {
  var suggestions = null
  var tagsUsedByYou = null
  var matches = api.intl.sync.startsWith

  return nest('tag.obs.suggest', function (stagedTagIds) {
    loadSuggestions()
    return function (word) {
      var filtered
      if (!word) {
        filtered = suggestions().slice(0, 200)
      } else {
        filtered = suggestions().filter((item) => {
          return matches(item.title, word) && !stagedTagIds().includes(item.tagId)
        })
      }
      filtered.push({
        title: 'Click or press , to create a new tag',
        value: word,
        tagId: false
      })
      return filtered
    }
  })

  function loadSuggestions () {
    if (!suggestions) {
      var id = api.keys.sync.id()
      var ScuttleTag = TagHelper(api.sbot.obs.connection)
      tagsUsedByYou = ScuttleTag.obs.allTagsFrom(id)
      var mostActive = ScuttleTag.obs.mostActive()
      var tags = computed([tagsUsedByYou, mostActive], function (a, b) {
        var result = Array.from(a)
        b.forEach((item, i) => {
          if (!result.includes(item[0])) {
            result.push(item)
          }
        })
        return result
      })

      suggestions = map(tags, suggestion, {idle: true})
      watch(suggestions)
    }
  }

  function suggestion (id) {
    if (Array.isArray(id)) {
      const tagName = api.about.obs.name(id[0])()
      return {
        title: tagName,
        subtitle: `(${id[1]})`,
        value: tagName,
        tagId: id[0]
      }
    } else {
      const tagName = api.about.obs.name(id)()
      return {
        title: tagName,
        subtitle: 'used by you',
        value: tagName,
        tagId: id
      }
    }
  }
}
