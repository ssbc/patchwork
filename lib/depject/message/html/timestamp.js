const h = require('mutant/h')
const nest = require('depnest')
const moment = require('moment-timezone')

exports.gives = nest('message.html.timestamp')
exports.needs = nest({
  'message.sync.timestamp': 'first',
  'message.sync.root': 'first'
})

exports.create = function (api) {
  return nest('message.html.timestamp', timestamp)

  function timestamp (msg, link = true) {
    if (link) {
      return h('a.Timestamp', {
        href: api.message.sync.root(msg) || msg.key,
        anchor: msg.key,
        title: moment(api.message.sync.timestamp(msg)).format('LLLL zz')
      }, moment(api.message.sync.timestamp(msg)).fromNow())
    } else {
      return moment(api.message.sync.timestamp(msg)).calendar(null, {
        sameDay: '[Today]',
        lastDay: '[Yesterday]',
        lastWeek: '[Last] dddd'
      })
    }
  }
}
