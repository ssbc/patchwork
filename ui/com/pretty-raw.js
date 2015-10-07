'use babel'
import React from 'react'
import ssbref from 'ssb-ref'
import app from '../lib/app'

class TableRow extends React.Component {
  render() {
    // :TODO: link rendering
    // if (ssbref.isLink(obj[k])) {
    //   var ref = obj[k]
    //   if (ssbref.isMsgId(ref))
    //     els.push(<TableRow path={path+k} value={ref} />) // :TODO: link row(k, com.a('#/msg/'+ref, ref)))
    //   else if (ssbref.isBlobId(ref))
    //     els.push(<TableRow path={path+k} value={ref} />) // :TODO: link row(k, com.a('#/webview/'+ref, obj.name || ref)))
    //   else
    //     els.push(<TableRow path={path+k} value={ref} />) // :TODO: link row(k, com.user(ref)))
    // }
    var value = this.props.value
    if (typeof value == 'boolean')
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
      els.push(<TableRow key={path+k} path={path+k} value={obj[k]} />)
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
      app.ssb.private.unbox(obj, function (err, decrypted) {
        if (decrypted)
          this.setState({ obj: decrypted })
      })
    }
  }
  render() {
    if (!this.state.obj || typeof this.state.obj == 'string')
      return <table className="pretty-raw"><tr><td>Encrypted Message</td></tr></table>
    return <table className="pretty-raw">{tableElements(false, this.state.obj)}</table>
  }
}