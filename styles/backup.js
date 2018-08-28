module.exports = (tokens)=> {
  let result = ''
  let indentation = 0;

  const indent = () => indentation += 1 
  const deindent = () => indentation -= 1
  const print = (text) => result += Array(indentation * 2).join(' ') + text

  Object.keys(tokens).forEach((a) => {
    if (a === 'objects') {
      Object.keys(tokens[a]).forEach((b) => {
        print(b + ' {\n')
        Object.keys(tokens[a][b]).forEach((c) =>  {
          if (c === 'rules') {
            Object.keys(tokens[a][b][c]).forEach((d) => {
              let value = tokens[a][b][c][d];
              if (value === undefined) {
                value = 'inherit'
              }
              console.log('a!@!!!!!', value)
              print(d + ': ' + value + ';\n')
            });
          } else {
            console.log('unhandled', tokens[a][b][c])
          }
        });
        print('}\n')
      })
    }
  });
  console.log(result)
  return result;
}
