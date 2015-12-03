'use babel'
import React from 'react'

class MDLSpinnerLayer extends React.Component {
  render() {
    return <div className={"mdl-spinner__layer mdl-spinner__layer-"+this.props.n}>
      <div className="mdl-spinner__circle-clipper mdl-spinner__left">
        <div className="mdl-spinner__circle" />
      </div>
      <div className="mdl-spinner__gap-patch">
        <div className="mdl-spinner__circle" />
      </div>
      <div className="mdl-spinner__circle-clipper mdl-spinner__right">
        <div className="mdl-spinner__circle" />
      </div>
    </div>
  }
}

export default class MDLSpinner extends React.Component {
  render() {
    return <div className="mdl-spinner mdl-js-spinner is-active is-upgraded">
      <MDLSpinnerLayer n="1" />
      <MDLSpinnerLayer n="2" />
      <MDLSpinnerLayer n="3" />
      <MDLSpinnerLayer n="4" />
    </div>
  }
}