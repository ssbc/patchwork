const nest = require('depnest')
const { h, computed } = require('mutant')
const hexrgb = require('hex-rgb')

exports.gives = nest('tag.html.tag')

exports.needs = nest({
  'about.obs.color': 'first',
  'about.obs.name': 'first'
})

exports.create = function (api) {
  return nest({ 'tag.html.tag': function (tagId, { href, nameFn, onRemove }) {
    const backgroundColor = api.about.obs.color(tagId)
    const fontColor = computed(backgroundColor, contrast)
    const style = {
      'background-color': backgroundColor,
      'color': fontColor
    }
    const tagName = nameFn ? nameFn(tagId) : api.about.obs.name(tagId)
    const removeTag = onRemove ? h('a', { 'ev-click': onRemove }, 'x') : ''
    const tag = h('Tag', { style }, [
      h('span', tagName),
      removeTag
    ])
    if (href) {
      const _href = typeof href === 'string' ? href : `/tags/${encodeURIComponent(tagId)}/all`
      return h('a.tag-link', { href: _href, title: tagId }, tag)
    }
    return tag
  }})
}

function contrast (backgroundColor) {
  const { red, green, blue } = hexrgb(backgroundColor)
  const C = [ red / 255, green / 255, blue / 255 ]
  for (var i = 0; i < C.length; ++i) {
    if (C[i] <= 0.03928) {
      C[i] = C[i] / 12.92
    } else {
      C[i] = Math.pow((C[i] + 0.055) / 1.055, 2.4)
    }
  }
  const L = 0.2126 * C[0] + 0.7152 * C[1] + 0.0722 * C[2]
  if (L > 0.179) {
    return '#000'
  } else {
    return '#fff'
  }
}
