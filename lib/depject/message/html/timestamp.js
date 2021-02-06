const h = require('mutant/h')
const nest = require('depnest')
const moment = require('moment-timezone')
const getTimestamp = require('../../../get-timestamp')

exports.gives = nest('message.html.timestamp')
exports.needs = nest({
  'message.sync.root': 'first'
})

exports.create = function (api) {
  return nest('message.html.timestamp', timestamp)

  function timestamp (msg, link = true) {
    if (link) {
      return h('a.Timestamp', {
        href: api.message.sync.root(msg) || msg.key,
        anchor: msg.key,
        title: moment(getTimestamp(msg)).format('LLLL zz')
      }, moment(getTimestamp(msg)).fromNow())
    } else {
      return moment(getTimestamp(msg)).calendar(null, {
        sameDay: '[Today]',
        lastDay: '[Yesterday]',
        lastWeek: '[Last] dddd'
      })
    }
  }
}
