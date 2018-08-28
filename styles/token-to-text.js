var tokenizer = require('../node_modules/micro-css/lib/tokenizer')

module.exports = function (style) {
  var result = getRules(style)

  if (style.entities) {
    eachGroup(style.entities, function (styleKey, styleValue) {
      if (!/^@svg /.exec(styleKey)) {
        result += getEntityCss(styleKey, styleValue) + '\n'
      }
    })
  }

  return result
}

function addParent (style, parent) {
  if (style && style !== parent) {
    style.parent = parent
  }
}

function getRules (style, prepend) {
  var result = ''

  if (style.objects) {
    eachGroup(style.objects, function (styleKey, styleValue) {
      addParent(styleValue, style)
      var selector = getSelector(styleKey)
      result += getCssForSelector(selector, styleValue)
    })
  }

  if (style.flags) {
    eachGroup(style.flags, function (styleKey, styleValue) {
      addParent(styleValue, style)
      styleKey.split(',').forEach(function (n) {
        var selector = getSelector(n.trim(), prepend)
        result += getCssForSelector(selector, styleValue)
      })
    })
  }

  if (style.pseudos) {
    eachGroup(style.pseudos, function (styleKey, styleValue) {
      addParent(styleValue, style)
      styleKey.split(',').forEach(function (n) {
        var selector = getPseudoSelector(n.trim(), prepend)
        result += getCssForSelector(selector, styleValue)
      })
    })
  }

  if (style.elements) {
    eachGroup(style.elements, function (styleKey, styleValue) {
      if (!styleValue) return
      addParent(styleValue, style)

      var selectors = []
      var subItems = ''

      styleKey.split(',').forEach(function (n) {
        var parts = n.trim().split('.')
        var selector = getElementSelector(parts[0], parts[1], prepend, styleValue.deep)

        subItems += getRules(styleValue, selector)
        selectors.push(selector)
      })

      result += getCssForSelector(selectors.join(', '), styleValue, subItems)
    })
  }

  return result
}

function getCssForSelector (selector, styleValue, overrideSubItems) {
  var result = ''
  if (!styleValue) return result
  if (styleValue.extensions) {
    result += getExtensions(selector, styleValue)
  }
  if (styleValue.rules) {
    result += getCssBlock(selector, styleValue)
  }
  if (overrideSubItems == null) {
    result += getRules(styleValue, selector)
  } else {
    result += overrideSubItems
  }
  console.log('selector', selector)
  console.log('cssForSelector', result)
  return result
}

function getEntityCss (styleKey, style) {
  var result = styleKey + ' {\n'

  if (style.rules) {
    eachGroup(style.rules, function (styleKey, value) {
      if (value) {
        result += styleKey + ': ' + handleValue(value, style) + ';\n'
      }
    })
  }

  if (style.elements) {
    eachGroup(style.elements, function (styleKey, value) {
      result += getEntityCss(styleKey, value) + ' '
    })
  }

  result += '}\n\n'

  return result
}

function getExtensions (selector, style) {
  var result = ''
  if (style.extensions) {
    style.extensions.forEach(function (styleKey) {
      var styleValue = find('mixins', style, styleKey)
      addParent(styleValue, style)
      if (styleValue) {
        selector.split(',').forEach(function (part) {
          result += getCssForSelector(part.trim(), styleValue)
        })
      }
    })
  }
  return result
}

function find (key, style, extensionName) {
  var result = null
  while (style && !result) {
    if (style[key] && style[key][extensionName]) {
      result = style[key][extensionName]
    }
    style = style.parent
  }
  return result
}

function getCssBlock (selector, style) {
  var result = selector + ' {\n'
  eachGroup(style.rules, function (styleKey, value) {
    if (value) {
      result += styleKey + ': ' + handleValue(value, style) + ';\n'
    }
  })
  return result + '}\n'
}

function handleValue (value, style) {
  if (!value) return ' '
  return value.replace(/(\W|^)(svg)\((.+)\)(\W|$)/g, function (match, prefix, type, styleKey, suffix) {
    if (type === 'svg') {
      var url = getSvgDataUrl(styleKey, style)
      return prefix + 'url("' + url + '")' + suffix
    } else {
      return ' '
    }
  })
}

function getSvgDataUrl (styleKey, style) {
  var parts = styleKey.split(' ')
  style = find('entities', style, '@svg ' + parts[0])
  if (style) {
    var styleValues = getRules(style)
    var svg = getSvgBlock(style.rules, styleValues, parts.slice(1))

    var encoded = new Buffer(svg).toString('base64')
    return 'data:image/svg+xml;charset=utf-8;base64,' + encoded
  }
}

function getSvgBlock (attributes, styles, classes) {
  var result = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1"'
  var content = ''
  Object.keys(attributes).forEach(function (styleKey) {
    if (styleKey === 'content') {
      content = attributes[styleKey].replace(/^["' ]+|["' ]+$/g, '')
    } else {
      result += ' ' + styleKey + '="' + attributes[styleKey] + '"'
    }
  })

  if (classes && classes.length) {
    result += ' class="' + classes.join(' ') + '"'
  }

  result += '>'

  result += '<defs><style type="text/css"><![CDATA[' + styles + ']]></style></defs>'
  result += content
  result += '</svg>'

  return result
}

function getSelector (styleKey, prepend) {
  console.log('!!!!!!!!!!!!!!!!')
  console.log('styleKey', styleKey)
  var selector = ''
  styleKey.split(' ').forEach(function (n) {
    if (n) {
      selector += escapeClass(n)
    }
  })
  //if (prepend) {
  //  selector = prepend + selector
  //}
  return selector
}

function getPseudoSelector (styleKey, prepend) {
  var selector = ''
  styleKey.split(' ').forEach(function (n) {
    if (n) {
      selector += n
    }
  })
  if (prepend) {
    selector = prepend + selector
  }
  return selector
}

function getElementSelector (styleKey, filter, prepend, isDeep) {
  var selector = escapeClass(styleKey)

  if (filter) {
    selector += '.' + escapeClass(filter)
  }

  if (prepend) {
    if (isDeep) {
      selector = prepend + ' (' + selector + ')'
    } else {
      selector = prepend + ' ' + selector
    }
  }

  return selector
}

function escapeClass (styleKey) {
  return styleKey.replace(/([\$\.])/g, '\\$1')
}

function eachGroup (groups, iterator) {
  Object.keys(groups).forEach(function (key) {
    iterator(key, groups[key])
  })
}
