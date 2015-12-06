'use babel'
import mlib from 'ssb-msgs'

// :TODO: generalize and move this file into ssb-msgs

export function countReplies (thread, filter) {
  if (!thread.related)
    return 0
  let n = 0
  let counted = {}
  thread.related.forEach(function (r) {
    if (!isaReplyTo(r, thread)) // only replies
      return
    if (counted[r.key]) // only count each message once
      return
    if (filter && !filter(r)) // run filter
      return
    n++
    counted[r.key] = true
  })
  return n
}

export function isaReplyTo (a, b) {
  var ac = a.value.content
  return (ac.root && mlib.link(ac.root).link == b.key || ac.branch && mlib.link(ac.branch).link == b.key)
}

export function relationsTo (a, b) {
  var rels = []
  const ac = a.value.content
  for (var k in ac) {
    mlib.links(ac[k]).forEach(l => {
      if (l.link === b.key)
        rels.push(k)
    })
  }
  return rels
}