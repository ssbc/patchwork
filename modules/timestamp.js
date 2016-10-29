var h = require('hyperscript')
var human = require('human-time')

function updateTimestampEl(el) {
  el.firstChild.nodeValue = human(new Date(el.timestamp))
  return el
}

setInterval(function () {
  var els = [].slice.call(document.querySelectorAll('.timestamp'))
  els.forEach(updateTimestampEl)
}, 60e3)

exports.message_main_meta = function (msg) {
  return updateTimestampEl(h('a.enter.timestamp', {
    href: '#'+msg.key,
    timestamp: msg.value.timestamp,
    title: new Date(msg.value.timestamp)
  }, ''))
}
