const Value = require('mutant/value')
const computed = require('mutant/computed')
const nest = require('depnest')
const human = require('human-time')

exports.gives = nest('lib.obs.timeAgo')

exports.needs = nest({
  'intl.sync.time': 'first'
})

exports.create = function (api) {
  return nest('lib.obs.timeAgo', timeAgo)

  function timeAgo (timestamp) {
    let timer
    const value = Value(TimeIntl(timestamp))
    return computed([value], (a) => a, {
      onListen: () => {
        timer = setInterval(refresh, 30e3)
        refresh()
      },
      onUnlisten: () => {
        clearInterval(timer)
      }
    }, {
      idle: true
    })

    function refresh () {
      value.set(TimeIntl(timestamp))
    }

    function TimeIntl (timestamp) {
      return api.intl.sync.time(Time(timestamp))
    }
  }
}

function Time (timestamp) {
  return human(new Date(timestamp))
}
