export function getDraft (id) {
  return localStorage['draft:'+id] || ''
}

export function saveDraft (id, text) {
  if (!text)
    removeDraft(id)
  else
    localStorage['draft:'+id] = text || ''
}

export function removeDraft (id) {
  delete localStorage['draft:'+id]
}