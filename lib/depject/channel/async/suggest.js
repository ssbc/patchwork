var nest = require('depnest')

var { onceTrue } = require('mutant')

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.gives = nest('channel.async.suggest')

exports.create = function (api) {
  return nest('channel.async.suggest', function () {
    return function (text, cb) {
      onceTrue(api.sbot.obs.connection, sbot => {
        sbot.patchwork.channels.suggest({ text, limit: 20 }, (err, items) => {
          if (err) return cb(err)
          cb(null, getSuggestions(items))
        })
      })
    }
  })

  function getSuggestions (items) {
    return items.map(item => {
      return {
        title: `#${item.id}`,
        id: `#${item.id}`,
        subtitle: item.count ? `(${item.count})` : null,
        value: `#${item.id}`,
        cls: 'channel' + (item.subscribed ? ' .-subscribed' : '')
      }
    })
  }
}
