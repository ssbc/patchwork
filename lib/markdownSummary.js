
exports.titleFromMarkdown = (text, max, maxLines) => {
  if (text === null) {
    return ''
  }
  text = text.trim().split('\n', maxLines + 1).join('\n')
  text = text.replace(/_|`|\*|#|^\[@.*?]|\[|]|\(\S*?\)/g, '').trim()
  text = text.replace(/:$/, '')
  text = text.trim().split('\n', 1)[0].trim()
  text = module.exports.truncate(text, max)
  return text
}

exports.truncate  = (text, maxLength) => {
  if (text.length > maxLength) {
    text = text.substring(0, maxLength - 2) + '...'
  }
  return text
}
