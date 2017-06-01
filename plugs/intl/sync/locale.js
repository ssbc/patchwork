const nest = require('depnest')
const locale = require('locale2')

exports.gives = nest('intl.sync.locale')
exports.create = () => {
  return nest('intl.sync.locale', () => locale)
}
