'use babel'
import React from 'react'
import t from 'patchwork-translations'
import app from '../lib/app'

export default class LanguageMenu extends React.Component {
  onChange(e) {
    var locale = e.target.value
    localStorage.locale = locale
    t.setLocale(locale)
    app.emit('update')
  }

  render() {
    return <div className='link'>
      <select onChange={this.onChange.bind(this)} defaultValue={t.locale}>
      { Object.keys(t.locales).map(function (lang) {
        var langName = t.locales[lang].lang
        return <option key={lang} value={lang}>{langName}</option>
      }) }
      </select>
    </div>
  }
}
