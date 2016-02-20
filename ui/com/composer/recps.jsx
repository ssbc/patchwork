'use babel'
import React from 'react'
import suggestBox from 'suggest-box'
import app from '../../lib/app'
import u from '../../lib/util'
import social from '../../lib/social-graph'

export const RECP_LIMIT = 7

class ComposerRecp extends React.Component {
  render() {
    return <span className="recp">
      {u.getName(this.props.id)}
      {this.props.isReadOnly ? '' : <a onClick={() => this.props.onRemove(this.props.id)}><i className="fa fa-remove"/></a>}
    </span>
  }
}

export class ComposerRecps extends React.Component {
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
    suggestBox(input, { any: app.suggestOptions['@'] }, { cls: 'msg-recipients' })
    input.addEventListener('suggestselect', this.onSuggestSelect.bind(this))
  }

  onChange(e) {
    this.setState({ inputText: e.target.value })
  }

  onSuggestSelect(e) {
    this.props.onAdd(e.detail.id)
    this.setState({ inputText: '' })
  }

  render() {
    const isAtLimit = (this.props.recps.length >= RECP_LIMIT)
    const warnings = this.props.recps.filter((id) => (id !== app.user.id) && !social.follows(id, app.user.id))
    return <div className="recps-inputs flex-fill">
      <i className="fa fa-user" /> To: {this.props.recps.map((r) => <ComposerRecp key={r} id={r} onRemove={this.props.onRemove} isReadOnly={this.props.isReadOnly} />)}
      { (!isAtLimit && !this.props.isReadOnly) ?
        <input ref="input" type="text" placeholder="Add recipients here" value={this.state.inputText} onChange={this.onChange.bind(this)} {...this.props} /> :
        '' }
      { isAtLimit ? <div className="warning">Recipient limit reached</div> : '' }
      { warnings.length ?
        <div>{warnings.map(id => <div key={id} className="warning">Warning: @{u.getName(id)} does not follow you, and may not receive your message.</div>)}</div> :
        '' }
    </div>
  }
}