var insertCss = require('insert-css')

module.exports = function (config) {
  var modules = require('depject')(
    overrideConfig(config),
    require('patchbay/modules_extra'),
    require('patchbay/modules_basic'),
    require('patchbay/modules_core'),
    require('./modules')
  )

  process.nextTick(() => {
    insertCss(modules.styles[0]() + require('./styles'))
  })

  return modules.app[0]()
}

function overrideConfig (config) {
  return {
    config: {
      gives: {'config': true},
      create: function (api) {
        return {
          config () {
            return config
          }
        }
      }
    }
  }
}
