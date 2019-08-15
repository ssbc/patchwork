module.exports = function many (ids, fn, intl) {
  ids = Array.from(ids)
  const featuredIds = ids.slice(0, 4)

  if (ids.length) {
    if (ids.length > 4) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), ', ',
        fn(featuredIds[2]), intl(' and '),
        ids.length - 3, intl(' others')
      ]
    } else if (ids.length === 4) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), ', ',
        fn(featuredIds[2]), intl(' and '),
        fn(featuredIds[3])
      ]
    } else if (ids.length === 3) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), intl(' and '),
        fn(featuredIds[2])
      ]
    } else if (ids.length === 2) {
      return [
        fn(featuredIds[0]), intl(' and '),
        fn(featuredIds[1])
      ]
    } else {
      return fn(featuredIds[0])
    }
  }
}
