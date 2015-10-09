'use babel'
import React from 'react'
import Modal from 'react-modal'
import app from '../lib/app'

class Issue extends React.Component {
  render() {
    let issue = this.props.issue
    return <div>
      <p><strong>{issue.title}</strong> {!issue.isRead ? 'new issue' : ''}</p>
      <p>{issue.message}</p>
      <p>
        <a onClick={() => this.props.onDismiss(issue)}>Dismiss</a>{' '}
        <a href={issue.issueUrl} target="_blank">File an Issue</a>
      </p>
      {issue.stack ? <pre><code>{issue.stack}</code></pre> : ''}
    </div>
  }
}

export default class Issues extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isOpen: false,
      issues: [],
      numIssues: 0,
      numUnread: 0
    }

    // helper to update the state on issue-changes
    this.updateState = () => {
      this.setState({
        issues: app.issues,
        numIssues: app.issues.length,
        numUnread: app.issues.filter((i) => !i.isRead).length,
        isOpen: (app.issues.filter((i) => (!i.isRead && i.isUrgent)).length > 0)
      })
    }
  }

  componentDidMount() {
    app.on('update:issues', this.updateState)
  }
  componentWillUnmount() {
    app.removeEventListener('update:issues', this.updateState)
  }

  onDismiss(issue) {
    issue.isRead = true
    this.updateState()
  }

  render() {
    let modalStyle = {
      overlay : {
        position          : 'fixed',
        top               : 0,
        left              : 0,
        right             : 0,
        bottom            : 0,
        backgroundColor   : 'rgba(255, 255, 255, 0.75)',
        zIndex            : 1000
      },
      content : {
        position                   : 'absolute',
        top                        : '40px',
        left                       : '40px',
        right                      : '40px',
        bottom                     : '40px',
        border                     : '1px solid #ccc',
        background                 : '#fff',
        overflow                   : 'auto',
        WebkitOverflowScrolling    : 'touch',
        borderRadius               : '4px',
        outline                    : 'none',
        padding                    : '20px'
      }
    }
    let open  = () => this.setState({ isOpen: true  })
    let close = () => this.setState({ isOpen: false })
    return <span>
      {this.state.numIssues ? <a onClick={open}>Issues ({this.state.numUnread})</a> : ''}
      <Modal isOpen={this.state.isOpen} onRequestClose={close} style={modalStyle}>
        {this.state.issues.map((issue, i) => <Issue key={'issue'+i} issue={issue} onDismiss={this.onDismiss.bind(this)} />)}
      </Modal>
    </span>
  }
}