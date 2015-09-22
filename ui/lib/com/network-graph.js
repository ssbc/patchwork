var h = require('hyperscript')
var app = require('../app')
var com = require('./index')

if ('sigma' in window) {
  sigma.canvas.nodes.square = function (node, context, settings) {
    var prefix = settings('prefix') || '',
        size = node[prefix + 'size']

    context.strokeStyle = node.color || settings('defaultNodeColor')
    context.fillStyle = 'rgba(238,238,238,0.7)'
    context.beginPath()
    context.rect(
      node[prefix + 'x'] - size,
      node[prefix + 'y'] - size,
      size * 2,
      size * 2
    )

    context.closePath()
    context.fill()
    context.stroke()
  }
}

module.exports = function (opts) {
  var container = h('.network-graph')
  opts = opts || {}
  opts.w = opts.w || 3
  opts.h = opts.h || 1
  app.ssb.friends.all(function (err, friends) {

    // generate graph
    var graph = { nodes: [], edges: [] }
    for (var id in friends) {
      // add node
      var inbounds = countInbounds(friends, id)
      var xr = Math.random()
      var yr = Math.random()
      if (xr > 0.45 && xr <= 0.5) xr -= 0.1
      if (yr > 0.45 && yr <= 0.5) yr -= 0.1
      if (xr < 0.55 && xr >= 0.5) xr += 0.1
      if (yr < 0.55 && yr >= 0.5) yr += 0.1
      graph.nodes.push({
        id: id,
        type: 'square',
        label: com.userName(id),
        x: (id == app.user.id) ? 1.5 : xr * opts.w,
        y: (id == app.user.id) ? 0.5 : yr * opts.h,
        size: inbounds+1,
        color: (id == app.user.id) ? '#970' : (friends[app.user.id] && friends[app.user.id][id] ? '#790' : (friends[id][app.user.id] ? '#00c' : '#666'))
      })

      // show edges related to current user
      if (id == app.user.id) {
        // outbound
        for (var id2 in friends[id]) {
          graph.edges.push({
            id: id+'->'+id2,
            source: id,
            target: id2,
            size: 0.1,
            color: '#9a3'
          })
        }
      } else {
        // inbound
        if (friends[id][app.user.id]) {
          graph.edges.push({
            id: id+'->'+app.user.id,
            source: id,
            target: app.user.id,
            size: 0.1,
            color: '#97a'
          })
        }
      }
    }

    // empty graph?
    if (graph.edges.length === 0) {
      // how embarrassing, plz hide it
      container.style.height = '1px'
      return
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