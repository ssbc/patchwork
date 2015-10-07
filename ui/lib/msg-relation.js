'use babel'
import mlib from 'ssb-msgs'

// :TODO: generalize and move this file into ssb-msgs

export function countReplies (thread) {
  let n = 0
  let counted = {}
  function iter (m) {
    if (!m.related)
      return
    m.related.forEach(function (r) {
      if (!isaReplyTo(r, m))
        return
      if (!counted[r.key]) // only count each message once
        n++
      counted[r.key] = true
      iter(r) 
    })
  }
  iter(thread)
  return n
}

export function isaReplyTo (a, b) {
  var c = a.value.content
  return (c.root && mlib.link(c.root).link == b.key || c.branch && mlib.link(c.branch).link == b.key)
}