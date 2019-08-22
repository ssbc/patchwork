const Value = require('mutant/value')
const ref = require('ssb-ref')
const nest = require('depnest')

exports.needs = nest('sbot.async.get', 'first')

exports.gives = nest('message.obs.get')

exports.create = function (api) {
  return nest('message.obs.get', function (key, hintMessage = null) {
    if (!ref.isMsg(key)) throw new Error('a msg id must be specified')
    const result = Value()

    api.sbot.async.get(key, (err, value) => {
      if (err) {
        // TODO: handle resolving out-of-order message!

        // guess the author
        let possibleAuthor
        if (hintMessage && hintMessage.value && hintMessage.value.content && hintMessage.value.content.reply && ref.isFeed(hintMessage.value.content.reply[key])) {
          possibleAuthor = hintMessage.value.content.reply[key]
        }

        result.set({
          key,
          value: {
            missing: true,
            author: possibleAuthor
          }
        })
      } else {
        result.set({
          key,
          value
        })
      }
    })

    return result
  })
}
