var nest = require('depnest')

exports.gives = nest('about.sync.shortFeedId')

exports.create = function () {
  return nest('about.sync.shortFeedId', function (id) {
    return id.slice(1, 10)
  })
}
