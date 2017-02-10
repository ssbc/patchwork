exports.needs = {
  person: 'first'
}

exports.gives = {
  many_people: true
}

exports.create = function (api) {
  return {
    many_people (ids) {
      ids = Array.from(ids)
      var featuredIds = ids.slice(-3).reverse()

      if (ids.length) {
        if (ids.length > 3) {
          return [
            api.person(featuredIds[0]), ', ',
            api.person(featuredIds[1]),
            ' and ', ids.length - 2, ' others'
          ]
        } else if (ids.length === 3) {
          return [
            api.person(featuredIds[0]), ', ',
            api.person(featuredIds[1]), ' and ',
            api.person(featuredIds[2])
          ]
        } else if (ids.length === 2) {
          return [
            api.person(featuredIds[0]), ' and ',
            api.person(featuredIds[1])
          ]
        } else {
          return api.person(featuredIds[0])
        }
      }
    }
  }
}
