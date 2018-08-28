var tok = require('../node_modules/micro-css/lib/tokenizer.js')
const fs = require('fs')
// var diff = require('deep-diff')
const _ = require('lodash')

const ttm = require('./token-to-mcss')

const { diff, addedDiff, deletedDiff, detailedDiff, updatedDiff } = require("deep-object-diff");

const dir = (...args) => console.dir(args, { depth: null }) 

const commonRes = {}
const darkRes = {}
const lightRes = {}

fs.readdir('./light', (err, files) => {
  Object.values(files).forEach((file) => {
    if (file.indexOf('.mcss') === -1) {
      return false
    } else {
      fs.readFile(`./light/${file}`, 'utf-8', (lightErr, lightFile) => {
        if (lightErr) throw lightErr;
        fs.readFile(`./dark/${file}`, 'utf-8', (darkErr, darkFile) => {
          if (darkErr) throw darkErr;

          lightTokens = tok(lightFile)
          darkTokens = tok(darkFile)

          // dir('light', lightTokens)
          // dir('dark', darkTokens)
          var style = diff(lightTokens, darkTokens)
          var mcss = ttm(style)
          if (mcss.length < 2) return
          const result = mcss

          fs.writeFile(`./diff-dark/${file}`, result, (err) => {
            if (err) throw err;
          });
        });
      });
    }
  })
})
