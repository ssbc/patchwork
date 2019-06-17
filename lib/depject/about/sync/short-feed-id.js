var nest = require('depnest')

exports.gives = nest('about.sync.shortFeedId')

exports.create = function (api) {
  return nest('about.sync.shortFeedId', function (id) {
    return `${id.slice(0, 10)}...`
  })
}
