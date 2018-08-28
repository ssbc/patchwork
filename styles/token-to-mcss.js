module.exports = (tokens) => {
  let result = ''
  let indentation = 1;

  const indent = () => indentation += 2 
  const deindent = () => indentation -= 2

  const print = (text) => {
    const indented = Array(indentation).join(' ') + text
    result += indented
    return indented
  }

  const walk = (obj, cb) => {
    Object.keys(obj).forEach((key) => {
    if (obj[key]) {
      if (key === 'objects' || key === 'flags' || key === 'pseudos' || key === 'entities' || key === 'elements' || key === 'mixins') {
        cb(obj[key], cb)
      } else if (key === 'rules') {
        Object.keys(obj[key]).forEach((rule) => {
          let value = obj[key][rule];
          if (value !== undefined) {
            print(rule + ': ' + value + ';\n')
          }
        });
      } else {
        print(key + ' {\n')
        cb(obj[key], cb)
        print('}\n')
      }
    }
    })
  }

  walk(tokens, walk)
  console.log(result)
  return result;
}
