var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var app = require('../app')
var com = require('./index')
var modals = require('../ui/modals')
var u = require('../util')

var hexagridOpts = { size: 30, nrow: 10 }
module.exports = function (msg, opts) {

  var stats = (msg) ? u.calcMessageStats(msg, opts) : {}

  // markup

  var upvoted   = (stats.uservote ===  1) ? '.selected' : ''
  var downvoted = (stats.uservote === -1) ? '.selected' : ''
  var upvote = h('a.upvote'+upvoted, { href: '#', onclick: (opts && opts.handlers) ? onupvote : null  }, com.icon('triangle-top'))
  var downvote = h('a.downvote'+downvoted, { href: '#', onclick: (opts && opts.handlers) ? ondownvote : null }, com.icon('triangle-bottom'))
  var voteTally = h('span.vote-tally', { 'data-amt': stats.voteTally||0 })

  // up/down voter hexagrids
  var upvoters = [], downvoters = []
  if (stats.votes) {
    for (var uid in stats.votes) {
      var v = stats.votes[uid]
      if (v === 1)  upvoters.push(uid)
      if (v === -1) downvoters.push(uid)
    }
  }

  var upvotersGrid, downvotersGrid
  if (upvoters.length) {
    upvotersGrid = com.userHexagrid(upvoters, hexagridOpts)
    upvotersGrid.classList.add('upvoters')
  }
  if (downvoters.length) {
    downvotersGrid = com.userHexagrid(downvoters, hexagridOpts)
    downvotersGrid.classList.add('downvoters')
  }

  return h('.message-stats',
    h('div',
      h('span.stat.votes', upvote, voteTally, downvote),
      h('a.stat.comments', { href: (msg) ? '#/msg/'+msg.key : 'javascript:void(0)', 'data-amt': stats.comments||0 }, com.icon('comment'))),
    upvotersGrid,
    downvotersGrid
  )

  // handlers

  function onupvote (e) {
    vote(e, upvote, 1)
  }

  function ondownvote (e) {
    vote(e, downvote, -1)
  }

  var voting = false
  function vote (e, el, btnVote) {
    e.preventDefault()
    e.stopPropagation()
    if (voting)
      return // wait please
    voting = true

    // get current state by checking if the control is selected
    // this won't always be the most recent info, but it will be close and harmless to get wrong,
    // plus it will reflect what the user expects to happen happening
    var wasSelected = el.classList.contains('selected')
    var newvote = (wasSelected) ? 0 : btnVote // toggle behavior: unset
    el.classList.toggle('selected') // optimistice ui update
    // :TODO: use msg-schemas
    app.ssb.publish(schemas.vote(msg.key, newvote), function (err) {
      voting = false
      if (err) {
        el.classList.toggle('selected') // undo
        modals.error('Error While Publishing', err)
      } else {
        // update ui
        var delta = newvote - (stats.uservote || 0)
        voteTally.dataset.amt = stats.voteTally = stats.voteTally + delta
        stats.uservote = newvote

        var up   = (newvote === 1)  ? 'add' : 'remove'
        var down = (newvote === -1) ? 'add' : 'remove'
        upvote.classList[up]('selected')
        downvote.classList[down]('selected')
      }
    })
  }
}