const fs = require('fs');
const { diff } = require('deep-object-diff');

const tok = require('../node_modules/micro-css/lib/tokenizer.js');
const ttm = require('./token-to-mcss');

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

        const style = diff(lightTokens, darkTokens);
        const mcss = ttm(style);
        if (mcss.length < 2) return;
        const result = mcss;

        fs.writeFile(`./diff-dark/${file}`, result, (writeErr) => {
          if (writeErr) throw writeErr;
        });
      });
    });

    return true;
  });
});
