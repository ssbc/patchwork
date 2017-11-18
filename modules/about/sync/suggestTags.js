var nest = require('depnest')
var { Set, Struct, map } = require('mutant')
var pull = require('pull-stream')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest('about.sync.suggestTags')

exports.create = function (api) {
  var tags = null
  var suggestions = null

  return nest('about.sync.suggestTags', function () {
    loadSuggestions()
    return function (word) {
      console.log('suggestions', suggestions())
      if (!word) {
        return suggestions().slice(0, 200)
      } else {
        return suggestions().filter((item) => {
          return item.title.toLowerCase().startsWith(word.toLowerCase())
        })
      }
    }
  })

  function loadSuggestions () {
    if (!tags) {
      tags = Set()
      suggestions = map(tags, suggestion)

      pull(
        api.sbot.pull.stream(sbot => sbot.about.stream({live: true})),
        pull.drain(item => {
          // HACK
          for (var target in item) {
            var taggers = item[target]['tag']
            if (taggers == null) continue
            for (var tagger in taggers) {
              var taggerTags = taggers[tagger][0]
              if (!Array.isArray(taggerTags)) taggerTags = [taggerTags]
              // TODO assert tags are all strings
              taggerTags.forEach(function (tag) {
                if (tags.has(tag)) return
                tags.add(tag)
              })
            }
          }
        })
      )
    }
  }

  function suggestion (id) {
    return Struct({
      title: id,
      id: `#${id}`,
      value: `#${id}`
    })
  }
}
