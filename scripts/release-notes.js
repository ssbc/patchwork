const fs = require('fs')
const path = require('path')

const version = process.env.npm_package_version

if (version == null) {
  throw new Error('no version found, are you running from npm? try `npm run release-notes`')
}

const template = fs.readFileSync(path.join(__dirname, '..', 'docs', 'release-notes-template.md'), 'utf8')
const changelog = fs.readFileSync(path.join(__dirname, '..', 'docs', 'CHANGELOG.md'), 'utf8')

let record = false
const lines = changelog.split('\n')

const relevantLines = lines.reduce((acc, cur) => {
  if (cur.startsWith('## ')) {
    if (cur.startsWith(`## v${version}`)) {
      record = true
      return acc
    } else {
      record = false
      return acc
    }
  }

  if (record) {
    acc.push(cur)
  }

  return acc
}, [])

const changes = relevantLines.join('\n')

const releaseNotes = template
  .replace(/\$\$VERSION/g, version)
  .replace(/\$\$CHANGES/g, changes)

console.log(releaseNotes)
