const nest = require('depnest')
const { onceTrue } = require('mutant')
const SsbAboutCore = require('ssb-about-core')
const pullCont = require('pull-cont')
const pull = require('pull-stream')

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'sqldb.async.abouts': 'first',
  'sqldb.async.get': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest({
  'about.async.latestValues': true,
  'about.async.latestValue': true,
  'about.async.socialValues': true,
  'about.async.socialValue': true
})

exports.create = function (api) {
  function getAbouts (opts) {
    return pullCont(function (cb) {
      api.sqldb.async.abouts(opts, function (err, results) {
        if (err) return cb(err)
        cb(null, pull.values(results))
      })
    })
  }
  function getMsg (opts) {
    return pullCont(function (cb) {
      api.sqldb.async.get(opts, function (err, results) {
        if (err) return cb(err)
        cb(null, pull.values(results))
      })
    })
  }
  const ssbAbout = SsbAboutCore({ getAbouts, getPubKey: api.keys.sync.id, getMsg })

  return nest({
    'about.async.latestValues': ssbAbout.latestValues,
    'about.async.latestValue': ssbAbout.latestValue,
    'about.async.socialValues': ssbAbout.socialValues,
    'about.async.socialValue': ssbAbout.socialValue
  })
}
