let depth = 0

module.exports = (tokens) => {
  let result = '';

  let indent = 1

  const print = (text) => {
    result += Array(indent + 1).join(' ')
    result += text;
    result += '\n';
  };

  const walk = (obj) => {
    depth += 1
    Object.keys(obj).forEach((key) => {
      if (obj[key]) {
        if (key === 'objects' || key === 'flags' || key === 'pseudos' || key === 'entities' || key === 'elements' || key === 'mixins') {
          walk(obj[key]);
        } else if (key === 'extensions') {
          // XXX: ignore? not sure what to do here
        } else if (key === 'rules') {
          Object.keys(obj[key]).forEach((rule) => {
            const value = obj[key][rule];
            if (value !== undefined) {
              print(`${rule}: ${value};`);
            }
          });
        } else {
          print(`${key} {`);
          indent += 2
          walk(obj[key]);
          print('}');
          indent -= 2
        }
      }
    });
  };

  walk(tokens);
  return result;
};
