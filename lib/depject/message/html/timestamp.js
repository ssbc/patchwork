const h = require('mutant/h')
const nest = require('depnest')
const moment = require('moment-timezone')
const getTimestamp = require('../../../get-timestamp')
const getRoot = require('../../../message/sync/root')

exports.gives = nest('message.html.timestamp')

exports.create = function (api) {
  return nest('message.html.timestamp', timestamp)

  function timestamp (msg, link = true) {
    if (link) {
      return h('a.Timestamp', {
        href: getRoot(msg) || msg.key,
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
