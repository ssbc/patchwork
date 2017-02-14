var nest = require('depnest')

exports.needs = nest({
  'profile.html.person': 'first'
})

exports.gives = nest({
  'profile.html': [ 'manyPeople' ]
})

exports.create = function (api) {
  return nest({
    'profile.html': { manyPeople }
  })

  function manyPeople (ids) {
    ids = Array.from(ids)
    var featuredIds = ids.slice(-3).reverse()

    if (ids.length) {
      if (ids.length > 3) {
        return [
          api.profile.html.person(featuredIds[0]), ', ',
          api.profile.html.person(featuredIds[1]),
          ' and ', ids.length - 2, ' others'
        ]
      } else if (ids.length === 3) {
        return [
          api.profile.html.person(featuredIds[0]), ', ',
          api.profile.html.person(featuredIds[1]), ' and ',
          api.profile.html.person(featuredIds[2])
        ]
      } else if (ids.length === 2) {
        return [
          api.profile.html.person(featuredIds[0]), ' and ',
          api.profile.html.person(featuredIds[1])
        ]
      } else {
        return api.profile.html.person(featuredIds[0])
      }
    }
  }
}
