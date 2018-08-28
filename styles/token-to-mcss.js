module.exports = (tokens) => {
  let result = '';

  const print = (text) => {
    result += text;
  };

  const walk = (obj, cb) => {
    Object.keys(obj).forEach((key) => {
      if (obj[key]) {
        if (key === 'objects' || key === 'flags' || key === 'pseudos' || key === 'entities' || key === 'elements' || key === 'mixins') {
          cb(obj[key], cb);
        } else if (key === 'rules') {
          Object.keys(obj[key]).forEach((rule) => {
            const value = obj[key][rule];
            if (value !== undefined) {
              print(`${rule}: ${value};\n`);
            }
          });
        } else {
          print(`${key} {\n`);
          cb(obj[key], cb);
          print('}\n');
        }
      }
    });
  };

  walk(tokens, walk);
  return result;
};
