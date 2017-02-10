var plugs = require('patchbay/plugs')
var person = plugs.first(exports.person = [])
exports.many_people = manyPeople

function manyPeople (ids) {
  ids = Array.from(ids)
  var featuredIds = ids.slice(-3).reverse()

  if (ids.length) {
    if (ids.length > 3) {
      return [
        person(featuredIds[0]), ', ',
        person(featuredIds[1]),
        ' and ', ids.length - 2, ' others'
      ]
    } else if (ids.length === 3) {
      return [
        person(featuredIds[0]), ', ',
        person(featuredIds[1]), ' and ',
        person(featuredIds[2])
      ]
    } else if (ids.length === 2) {
      return [
        person(featuredIds[0]), ' and ',
        person(featuredIds[1])
      ]
    } else {
      return person(featuredIds[0])
    }
  }
}
