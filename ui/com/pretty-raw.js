'use babel'
import React from 'react'
import ssbref from 'ssb-ref'
import { UserLink, MsgLink, BlobLink } from './index'
import app from '../lib/app'

class TableRow extends React.Component {
  render() {
    var value = this.props.value
    if (ssbref.isLink(value)) {
      if (ssbref.isMsg(value))
        value = <MsgLink id={value} name={this.props.name} />
      else if (ssbref.isBlob(value))
        value = <BlobLink id={value} name={this.props.name} />
      else
        value = <UserLink id={value} />
    }
    else if (typeof value == 'boolean')
      value = (value) ? 'true' : 'false'
    return <tr><td>{this.props.path}</td><td>{value}</td></tr>
  }
}

function tableElements(path, obj) {
  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object')
      els = els.concat(tableElements(path+k, obj[k]))
    else
      els.push(<TableRow key={path+k} path={path+k} value={obj[k]} name={obj.name} />)
  }
  return els
}

export class Table extends React.Component {
  constructor(props) {
    super(props)
    this.state = { obj: null }
  }
  componentDidMount() {
    var obj = this.props.obj
    this.setState({ obj: obj })
    if (typeof obj == 'string') {
      // try to decrypt
      app.ssb.private.unbox(obj, (err, decrypted) => {
        if (decrypted)
          this.setState({ obj: decrypted })
      })
    }
  }
  render() {
    if (!this.state.obj || typeof this.state.obj == 'string')
      return <table className="pretty-raw"><tbody><tr><td>Encrypted Message</td></tr></tbody></table>
    return <table className="pretty-raw"><tbody>{tableElements(false, this.state.obj)}</tbody></table>
  }
}