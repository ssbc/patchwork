var h = require('hyperscript')
var app = require('../app')
var com = require('./index')

module.exports = function (from, to, opts) {
  var container = h('.connection-graph')
  opts = opts || {}
  opts.w = opts.w || 3
  opts.h = opts.h || 1
  app.ssb.friends.all(function (err, friends) {

    // generate graph
    var graph = { nodes: [], edges: [] }
    for (var id in friends) {
      // add node
      var inbounds = countInbounds(friends, id)
      if (id == from) {
        graph.nodes.push({
          id: id,
          type: 'square',
          label: com.userName(id),
          x: 0.05 * opts.w,
          y: 0.5 * opts.h,
          size: inbounds+1,
          color: '#970'
        })
      } else if (id == to) {
        graph.nodes.push({
          id: id,
          type: 'square',
          label: com.userName(id),
          x: 0.95 * opts.w,
          y: 0.5 * opts.h,
          size: inbounds+1,
          color: '#970'
        })
      } else if (onpath(friends, from, to, id)) {
        var xr = Math.random() * 0.2
        var yr = Math.random()
        graph.nodes.push({
          id: id,
          type: 'square',
          label: com.userName(id),
          x: (0.4 + xr) * opts.w,
          y: yr * opts.h,
          size: inbounds+1,
          color: '#790'
        })
      } else {
        continue;
      }

      // show edges related to from/to
      for (var id2 in friends[id]) {
        if (id == from && onpath(friends, from, to, id2) || id2 == to && onpath(friends, from, to, id) || id == from && id2 == to) {
          graph.edges.push({
            id: id+'->'+id2,
            source: id,
            target: id2,
            size: (id == from && id2 == to) ? 1 : 0.1,
            color: (id == from && id2 == to) ? '#97a' : (id == from) ? '#c93' : '#9a3'
          })
        }
      }       
    }

    // render
    var s = new sigma({
      graph: graph,
      renderer: { container: container, type: 'canvas' },
      settings: opts
    })
  })
  return container
}

function countInbounds (graph, id) {
  var n=0
  for (var id2 in graph) {
    if (id in graph[id2])
      n++
  }
  return n
}

function onpath (graph, from, to, id) {
  if (graph[from] && graph[from][id] && graph[id] && graph[id][to])
    return true
  return false
}