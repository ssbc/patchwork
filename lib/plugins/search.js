const pull = require('pull-stream')
const pullCat = require('pull-cat')

module.exports = function (ssb) {
  return {
    linear: function ({ lt, gt, reverse, limit, query, old, live }) {
      // handle markers passed in to lt / gt
      const opts = { reverse, old, live, private: true }
      if (lt && typeof lt.timestamp === 'number') lt = lt.timestamp
      if (gt && typeof gt.timestamp === 'number') gt = gt.timestamp
      if (typeof lt === 'number') opts.lt = lt
      if (typeof gt === 'number') opts.gt = gt

      const matchesQuery = searchFilter(query)
      const marker = { marker: true, timestamp: null }

      const stream = pull(
        ssb.createLogStream(opts),
        pull.through(msg => {
          marker.timestamp = msg.timestamp
        }),
        pull.filter(matchesQuery)
      )

      // TRUNCATE
      if (typeof limit === 'number') {
        let count = 0
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
    },
    privateLinear: function ({ reverse, query, old, live, author }) {
      // handle markers passed in to lt / gt
      const opts = { reverse, old, live, private: true }
      const filter = {
        timestamp: { $gt: 0 }
      }

      if (author) {
        filter.value = {
          author
        }
      }

      opts.query = [
        { $filter: filter }
      ]

      const matchesQuery = searchFilter(query)

      return pull(
        ssb.private.read(opts),
        pull.filter(matchesQuery)
      )
    }
  }
}

function searchFilter (terms) {
  return function (msg) {
    if (msg.sync) return true
    const c = msg && msg.value && msg.value.content
    return c && (
      msg.key === terms[0] || andSearch(terms.map(function (term) {
        return new RegExp('\\b' + term + '\\b', 'i')
      }), [c.text, c.name, c.title])
    )
  }
}

function andSearch (terms, inputs) {
  for (let i = 0; i < terms.length; i++) {
    let match = false
    for (let j = 0; j < inputs.length; j++) {
      if (terms[i].test(inputs[j])) match = true
    }
    // if a term was not matched by anything, filter this one
    if (!match) return false
  }
  return true
}
