var pull = require('pull-stream')
var pullCat = require('pull-cat')

module.exports = function (ssb, config) {
  return {
    linear: function ({lt, gt, reverse, limit, query, old, live}) {
      // handle markers passed in to lt / gt
      var opts = {reverse, old, live}
      if (lt && typeof lt.timestamp === 'number') lt = lt.timestamp
      if (gt && typeof gt.timestamp === 'number') gt = gt.timestamp
      if (typeof lt === 'number') opts.lt = lt
      if (typeof gt === 'number') opts.gt = gt

      var matchesQuery = searchFilter(query)
      var marker = {marker: true, timestamp: null}

      var stream = pull(
        ssb.createLogStream(opts),
        pull.map(msg => {
          if (msg.value && typeof msg.value.content === 'string') {
            var unboxed = ssb.private.unbox(msg)
            if (unboxed) {
              return unboxed
            }
          }
          return msg
        }),
        pull.through(msg => {
          marker.timestamp = msg.timestamp
        }),
        pull.filter(matchesQuery)
      )

      // TRUNCATE
      if (typeof limit === 'number') {
        var count = 0
        return pullCat([
          pull(
            stream,
            pull.take(limit),
            pull.through(() => {
              count += 1
            })
          ),

          // send truncated marker for resuming search
          pull(
            pull.values([marker]),
            pull.filter(() => count === limit)
          )
        ])
      } else {
        return stream
      }
    }
  }
}

function searchFilter (terms) {
  return function (msg) {
    if (msg.sync) return true
    var c = msg && msg.value && msg.value.content
    return c && (
      msg.key === terms[0] || andSearch(terms.map(function (term) {
        return new RegExp('\\b' + term + '\\b', 'i')
      }), [c.text, c.name, c.title])
    )
  }
}

function andSearch (terms, inputs) {
  for (var i = 0; i < terms.length; i++) {
    var match = false
    for (var j = 0; j < inputs.length; j++) {
      if (terms[i].test(inputs[j])) match = true
    }
    // if a term was not matched by anything, filter this one
    if (!match) return false
  }
  return true
}
