var extend = require('xtend')

module.exports = function (msg, bumpFilter) {
  if (bumpFilter) {
    var bump = typeof bumpFilter === 'function' ? bumpFilter(msg) : bumpFilter
    if (bump) {
      if (typeof bump === 'string') bump = { type: bump }
      return extend({
        id: msg.key,
        author: msg.value.author
      }, bump instanceof Object ? bump : {})
    }
  }
}
