const fs = require('fs');
const { diff } = require('deep-object-diff');

const tok = require('../node_modules/micro-css/lib/tokenizer.js');
const ttm = require('./token-to-mcss');

function equalProps(a,b){
  var newObj = {}; 
  Object.keys(a).forEach((key)=> {
    if (typeof a[key] === 'object'){
      if (b !== undefined) {
        var obj = equalProps(a[key], b[key]);
        newObj[key] = obj;
      }
    } else {
      if (a !== undefined && b !== undefined) {
        if (a[key] == b[key]) {
          newObj[key] = a[key];
        }
      }
    }
  });
  return newObj;
}

fs.readdir('./light', (err, files) => {
  Object.values(files).forEach((file) => {
    if (file.indexOf('.mcss') === -1) {
      return false;
    }
    fs.readFile(`./light/${file}`, 'utf-8', (lightErr, lightFile) => {
      if (lightErr) throw lightErr;
      fs.readFile(`./dark/${file}`, 'utf-8', (darkErr, darkFile) => {
        if (darkErr) throw darkErr;

        const lightTokens = tok(lightFile);
        const darkTokens = tok(darkFile);

        const base = equalProps(darkTokens, lightTokens);
        const baseResult = ttm(base);

        const darkDiff = ttm(diff(base, darkTokens))
        const lightDiff = ttm(diff(base, lightTokens))

        fs.writeFile(`./base/${file}`, baseResult, (writeBaseErr) => {
          if (writeBaseErr) throw writeBaseErr;
        });
        fs.writeFile(`./diff-light/${file}`, lightDiff, (writeLightErr) => {
          if (writeLightErr) throw writeLightErr;
        });
        fs.writeFile(`./diff-dark/${file}`, darkDiff, (writeDarkErr) => {
          if (writeDarkErr) throw writeDarkErr;
        });
      });
    });

    return true;
  });
});
