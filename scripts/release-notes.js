const fs = require('fs')
const path = require('path')

const version = process.env.npm_package_version

if (version == null) {
  throw new Error('no version found, are you running from npm? try `npm run release-notes`')
}

const template = fs.readFileSync(path.join(__dirname, '..', 'docs', 'release-notes-template.md'), 'utf8')

const releaseNotes = template.replace(/\$\$VERSION/g, version)
console.log(releaseNotes)
