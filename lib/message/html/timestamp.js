const h = require('mutant/h')
const moment = require('moment-timezone')
const getTimestamp = require('../../get-timestamp')
const getRoot = require('../sync/root')

module.exports = function timestamp (msg, link = true) {
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
