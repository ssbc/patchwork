'use babel'
import React from 'react'
import suggestBox from 'suggest-box'

class Token extends React.Component {
  render() {
    return <span className="token">
      {this.props.token.label}
      {this.props.isReadOnly ? '' : <a onClick={() => this.props.onRemove(this.props.token)}><i className="fa fa-remove"/></a>}
    </span>
  }
}

export default class TokensInput extends React.Component {
  constructor(props) {
    super(props)
    this.state = { inputText: '' }
  }

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
    suggestBox(input, { any: this.props.suggestOptions }, { cls: 'token-input-options' })
    input.addEventListener('suggestselect', this.onSuggestSelect.bind(this))
  }

  onChange(e) {
    this.setState({ inputText: e.target.value })
  }

  onSuggestSelect(e) {
    this.props.onAdd(e.detail)
    this.setState({ inputText: '' })
  }

  onKeyDown(e) {
    if (!this.props.allowArbitrary)
      return
    const v = this.state.inputText.trim()
    if (e.keyCode === 13 && v) {
      this.props.onAdd(v)
      this.setState({ inputText: '' })      
    }
  }

  render() {
    const isAtLimit = (this.props.maxTokens && this.props.tokens.length >= this.props.maxTokens)
    return <div className={(this.props.className||'')+' tokens-input'}>
      <div>
        {this.props.label} {this.props.tokens.map(t => <Token key={t.value} token={t} onRemove={this.props.onRemove} isReadOnly={this.props.isReadOnly} />)}
        { (!isAtLimit && !this.props.isReadOnly) ?
          <input ref="input" type="text" placeholder={this.props.placeholder} value={this.state.inputText} onChange={this.onChange.bind(this)} /> :
          '' }
      </div>
      { isAtLimit ? <div className="warning">{this.props.limitErrorMsg}</div> : '' }
    </div>
  }
}