var nest = require('depnest')
var { h, computed } = require('mutant')
exports.gives = nest('message.html.meta')
exports.needs = nest({
  'message.obs.likes': 'first',
  'profile.obs.names': 'first'
})

exports.create = function (api) {
  return nest('message.html.meta', function likes (msg) {
    return computed(api.message.obs.likes(msg.key), likeCount)
  })

  function likeCount (likes) {
    if (likes.length) {
      return [' ', h('span.likes', {
        title: api.profile.obs.names(likes)
      }, ['+', h('strong', `${likes.length}`)])]
    }
  }
}
