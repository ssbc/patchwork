var nest = require('depnest')
var ref = require('ssb-ref')
var { h, Dict, Value, watch, throttle, computed, map, onceTrue } = require('mutant')

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'intl.sync.i18n': 'first',
  'blob.sync.url': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/gallery') return
    const query = Value('')
    const results = Dict({})

    watch(throttle(query, 300), q => {
      if (q && q.length < 3) return
      onceTrue(api.sbot.obs.connection, sbot => {
        sbot.meme.search(q, (err, data) => {
          if (err) return console.error(err)
          results.set(data)
        })
      })
    })

    /*
    var prepend = [
      h('input', {
        'placeholder': 'search image by name',
        'ev-input': ev => query.set(ev.target.value)
      })
    ]

    if (path !== '/gallery') return

    const i18n = api.intl.sync.i18n
    
    var view = api.feed.html.rollup(api.feed.pull.public, {
      prepend: prepend,
      bumpFilter: (msg) => msg.value.content.type !== 'vote'
    })

    return view
    */

   return h('Scroller', { style: { overflow: 'auto' } }, [
      h('div.wrapper', [
        h('div.wrapper', [
          h('input', {
            'style': { 
              'margin': '20px 0',
              'width': '100%',
              'border':'1px solid #ccc',
              'border-radius': '3px',
              'padding': '8px'
            },
            'placeholder': 'search image by name',
            'ev-input': ev => query.set(ev.target.value)
          }),
          h('section.results', computed([results, query], (results, query) => {
            if (!Object.keys(results).length && query.length >= 3) return h('p', '0 results')
            return Object.keys(results).map(blob => {
              return h('div', [
                h('img', { 
                  style: {
                    'width':'100%',
                    'border':'10px solid #fff',
                    'margin':'0 0 15px'
                  },
                  src: api.blob.sync.url(blob)
                })
              ])
            })
          }))
        ])
      ])
    ]);
  })
}
