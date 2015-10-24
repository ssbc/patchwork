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
  var c = a.value.content
  return (c.root && mlib.link(c.root).link == b.key || c.branch && mlib.link(c.branch).link == b.key)
}