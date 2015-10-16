#! /usr/bin/env node

require('child_process')
  .spawn(
    require('path').join(__dirname, 'node_modules/.bin/electron'),
    ['.'],
    {stdio: 'inherit', cwd: __dirname}
  )
