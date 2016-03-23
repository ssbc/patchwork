'use babel'
import React from 'react'
import suggestBox from 'suggest-box'
import app from '../../lib/app'

function getChannelSuggestions () {
  return app.channels.map(ch => {
    return {
      cls: 'user',        
      title: '#'+ch.name,
      value: ch.name
    }
  })
}

const badNameCharsRegex = /[^A-Za-z0-9\._-]/g
function sanitize (str) {
  return str.replace(badNameCharsRegex, '')
}

export default class ComposerChannel extends React.Component {
  componentDidMount() {
    this.setupSuggest()
  }
  componentDidUpdate() {
    this.setupSuggest()
  }
  setupSuggest() {
    // setup the suggest-box
    const input = this.refs && this.refs.input
    if (!input || input.isSetup)
      return
    input.isSetup = true
    suggestBox(input, { any: getChannelSuggestions() }, { cls: 'msg-recipients' })
    input.addEventListener('suggestselect', this.onSuggestSelect.bind(this))
  }

  onChange(e) {
    this.props.onChange(sanitize(e.target.value))
  }

  onSuggestSelect(e) {
    this.props.onChange(sanitize(e.detail.value))
  }

  render() {
    if (this.props.isReadOnly) {
      return <div><i className="fa fa-hashtag" /> Channel: {this.props.value||<span style={{color:'#aaa'}}>none</span>}</div>
    }
    return <div className="flex flex-fill recps-inputs">
      <span><i className="fa fa-hashtag" /> Channel:</span> <input className="flex-fill" ref="input" type="text" placeholder="Set the topic here (optional)" value={this.props.value} onChange={this.onChange.bind(this)} />
    </div>
  }
}