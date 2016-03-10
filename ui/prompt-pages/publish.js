// fetch message
// TODO - better error handling
var messageContent = JSON.parse(decodeURIComponent(window.location.hash.slice(1)))
if (!messageContent)
  throw "No message"

// render preview
preview.innerText = preview.textContent = JSON.stringify(messageContent, null, 2)

// setup handlers
no.addEventListener('click', function (e) {
  e.preventDefault()
  window.close()
})
yes.addEventListener('click', function (e) {
  if (messageContent) {
    ssb.publish(messageContent, function (err) {
      if (err)
        console.log(err) // TODO - better error handling
      else
        window.close()
    })
    e.preventDefault()
  }
})