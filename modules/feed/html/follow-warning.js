var nest = require('depnest')
var { when, h } = require('mutant')

exports.needs = nest({
  'intl.sync.i18n': 'first'
})

exports.gives = nest({
  'feed.html.followWarning': true,
  'feed.html.followerWarning': true
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('feed.html', {
    followWarning: function followWarning (condition, explanation) {
      return renderWarningBox(condition, i18n('You are not following anyone'), explanation)
    },
    followerWarning: function followerWarning (condition, explanation) {
      return renderWarningBox(condition, i18n('You have no followers'), explanation)
    }
  })

  function renderWarningBox (condition, header, explanation) {
    var content = h('div', {
      classList: 'NotFollowingAnyoneWarning'
    }, h('section', [
      h('h1', header),
      h('p', explanation),
      h('p', [i18n('For help getting started, see the guide at '),
        h('a', {
          href: 'https://scuttlebutt.nz/getting-started.html'
        }, 'https://scuttlebutt.nz/getting-started.html')
      ])
    ]))

    return when(condition, content)
  }
}
