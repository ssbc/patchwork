const nest = require('depnest')
var addSuggest = require('suggest-box')
var resolve = require('mutant/resolve')

exports.needs = nest({
  'profile.async.suggest': 'first',
})

exports.gives = nest('secrets.async.suggest')

exports.create = function (api) {
  return nest('secrets.async.suggest', function (textArea) {
    var getProfileSuggestions = api.profile.async.suggest()

    setImmediate(() => {
      addSuggest(
        textArea,
        (inputText, cb) => getProfileSuggestions(inputText.slice(1), cb),
        { cls: 'SuggestBox' })
    })
  })
}
