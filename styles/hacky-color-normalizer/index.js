const colors = require('./colors')

module.exports = (value) => {
  const hashLocation = value.indexOf('#')
  const arrowLocation = value.indexOf('<') // svg
  if (arrowLocation === -1 && hashLocation > -1) {
    // make sure we don't break stuff like `color: red !important`
    let breakpoint = value.indexOf(' ', hashLocation)
    if (breakpoint === -1 || breakpoint < 3) breakpoint = value.length
    const color = value.slice(hashLocation, breakpoint).toLowerCase()
    let shorthand
    let longhand
    if (color.length === 4) {
      shorthand = color
      longHand = [
        color[0],
        color[1],
        color[1],
        color[2],
        color[2],
        color[3],
        color[3]
      ].join('')
    } else if (color.length === 7) {
      longhand = color
      if (color[1] === color[2] && color[2] === color[3] && color[5] ===color[6]) {
        shortHand = [
          color[0],
          color[1],
          color[3],
          color[5]
        ].join('')
      }
    }

    let foundColor

    Object.keys(colors).forEach(colorName => {
      if (colors[colorName] === longhand) {
        foundColor = true
        value = value.replace(value.slice(hashLocation, breakpoint), colorName)
      }
    })

    if (!foundColor && shorthand) {
      value = value.replace(value.slice(hashLocation, breakpoint), shorthand)
    } else if (!foundColor && longhand) {
      value = value.replace(value.slice(hashLocation, breakpoint), color)
    }
  }
  return value
}

