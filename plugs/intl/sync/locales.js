const nest = require('depnest')

exports.gives = nest('intl.sync.locales')
exports.create = function () {
  return nest(
    'intl.sync.locales',
    () => require('../../../locales')
  )
}
