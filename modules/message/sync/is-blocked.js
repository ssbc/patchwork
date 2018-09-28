const nest = require('depnest')

exports.gives = nest('message.sync.isBlocked')

exports.needs = nest({
  'contact.obs.blocking': 'first',
  'contact.obs.raw': 'first',
  'keys.sync.id': 'first'
})

exports.create = function (api) {
  var cache = null

  return nest('message.sync.isBlocked', function isBlockedMessage (msg, rootMessage) {
    if (!cache) {
      cache = api.contact.obs.blocking(api.keys.sync.id())
    }

    if (rootMessage) {
      // check if the author of the root message blocks the author of the message
      var rawContact = api.contact.obs.raw(rootMessage.value.author)
      if (rawContact()[msg.value.author] === false) {
        return true
      }
    }

    return cache().includes(msg.value.author)
  })
}
