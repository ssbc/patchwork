const electron = require('electron')
const { Application } = require('spectron')
const assert = require('assert')
const tmp = require('tmp')
 
tmp.setGracefulCleanup() // always cleanup the tmpdir automatically
const tmpObj = tmp.dirSync({
  prefix: 'patchwork-test-',
  unsafeCleanup: true, // always delete the dir when cleaning up
})
const tmpDir = tmpObj.name
console.log('Dir:', tmpDir)

const app = new Application({
  path: electron,
  args: [
    // todo use path.join
    '../index.js',
    '--path',
    tmpDir,
  ],
})

app.start().then(function () {
  // Check if the window is visible
  return app.browserWindow.isVisible()
}).then(function (isVisible) {
  // Verify the window is visible
  assert.equal(isVisible, true)
}).then(function () {
  // Get the window's title
  return app.client.getTitle()
}).then((title) => {
  assert.equal(title, 'Patchwork')
}).catch(err => console.error('crash:', err))
