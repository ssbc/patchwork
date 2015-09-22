

exports.textDecoding = function (el, text) {
  var n = 1
  var text2 = btoa(text)
  el.innerText = text2.slice(0, text.length)
  setTimeout(function () {
    var eli = setInterval(function () {
      el.innerText = text.slice(0, n) + text2.slice(n, text.length)
      n++
      if (n > text.length)
        clearInterval(eli)
    }, 33)
  }, 1500)
}