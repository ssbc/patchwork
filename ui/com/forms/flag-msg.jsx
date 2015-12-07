'use babel'
import React from 'react'
import RadioSet from '../form-elements/radio-set'
import app from '../../lib/app'

export default class FlagMsg extends React.Component {
  constructor(props) {
    super(props)
    this.state = { reason: 'spam' }
  }

  componentDidMount() {
    this.props.setIsValid(true)
  }

  onChange(reason) {
    this.setState({ reason: reason })
  }

  submit() {
    this.props.onSubmit(this.state.reason)
  }

  render() {
    return <div>
      <form className="inline" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <h1><i className="fa fa-flag" /> Flag this Message</h1>
          <div>{"Flagging hides unwanted/negative content. What's your reason for flagging this message?"}</div>
          <RadioSet group="reason" options={[{ label: 'Spam', value: 'spam', checked: true }, { label: 'Abusive', value: 'abuse' }]} onChange={this.onChange.bind(this)} />
        </fieldset>
      </form>
    </div>
  }
}