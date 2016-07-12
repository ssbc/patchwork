// setup basic error-handling, in case app fails to load

(function () {

var locales = {
  da: {
    LoadingError: "Beklager! Patchwork løbt ind i den fejl under indlæsning.",
    Loading: "Indlæser..."
  },
  en: {
    LoadingError: "We're sorry! Patchwork experienced an error while loading.",
    Loading: "Loading..."
  },
  "pt-BR": {
    LoadingError: "Lamentamos! Ocorreu um erro ao carregar o Patchwork.",
    Loading: "Carregando..."
  },
  "pt-PT": {
    LoadingError: "Pedimos desculpa! Ocorreu um erro ao carregar o Patchwork.",
    Loading: "Carregando..."
  },
  "zh-cn": {
    LoadingError: "抱歉！Patchwork加载时出现问题。",
    Loading: "载入中..."
  }
}

function tryLocale(locale) {
  if (locale in locales) return locale
  locale = String(locale).replace(/[._].*$/, '')
  if (locale in locales) return locale
}

function t(str) {
  var locale = tryLocale(localStorage.locale)
            || tryLocale(navigator.language)
            || 'en'
  return locales[locale][str]
}

window.loadErrorHandler = function (e) {
  console.error(e.error || e)

  // hide spinner
  document.querySelector('.loading').style.display = 'none'

  // render heading
  var h1 = document.createElement('h1')
  h1.innerText = t('LoadingError')
  h1.style.margin = '10px'
  document.body.appendChild(h1)

  // render stack
  var pre = document.createElement('pre')
  pre.style.margin = '10px'
  pre.style.padding = '10px'
  pre.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
  pre.innerText = e.error ? (e.error.stack || e.error.toString()) : e.message
  document.body.appendChild(pre)
}
window.addEventListener('error', window.loadErrorHandler)

document.querySelector('.loading').title = t('Loading')

})()