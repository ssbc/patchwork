// setup basic error-handling, in case app fails to load

window.loadErrorHandler = function (e) {
  console.error(e.error)

  // render heading
  var h1 = document.createElement('h1')
  h1.innerText = 'We\'re sorry! Patchwork experienced an error while loading.'
  h1.style.margin = '10px'
  document.body.appendChild(h1)

  // render stack
  var pre = document.createElement('pre')
  pre.style.margin = '10px'
  pre.style.padding = '10px'
  pre.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
  pre.innerText = e.error.stack || e.error.toString()
  document.body.appendChild(pre)
}
window.addEventListener('error', window.loadErrorHandler)