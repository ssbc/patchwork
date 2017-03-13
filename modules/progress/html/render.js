var svg = require('mutant/svg-element')
var computed = require('mutant/computed')
var nest = require('depnest')

exports.gives = nest('progress.html.render')

exports.create = function (api) {
  return nest('progress.html.render', function (pos, classList) {
    return svg('svg RadialProgress', {
      viewBox: '-20 -20 240 240',
      classList
    }, [
      svg('path', {
        d: 'M100,0 a100,100 0 0 1 0,200 a100,100 0 0 1 0,-200',
        'stroke-width': 40,
        'stroke': '#CEC',
        'fill': 'none'
      }),
      svg('path', {
        d: 'M100,0 a100,100 0 0 1 0,200 a100,100 0 0 1 0,-200',
        'stroke-dashoffset': computed(pos, (pos) => {
          pos = Math.min(Math.max(pos, 0), 1)
          return (1 - pos) * 629
        }),
        'stroke-width': 40,
        'stroke-dasharray': 629,
        'stroke': '#33DA33',
        'fill': 'none'
      })
    ])
  })
}
