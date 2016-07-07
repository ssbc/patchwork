'use babel'
import React from 'react'
import Modal from 'react-modal'
import app from '../lib/app'
import t from 'patchwork-translations'

class Issue extends React.Component {
  render() {
    const issue = this.props.issue
    return <div className={'issue'+(issue.isRead ? ' dismissed' : '')}>
      <h1>{issue.title} <small>{issue.isRead ? t('issue.dismissed') : ''}</small></h1>
      <div>{issue.message}</div>
      {issue.stack ? <pre><code>{issue.stack}</code></pre> : ''}
      <div className="toolbar flex">
        { issue.isRead ?
          '' :
          <a className="btn" onClick={() => this.props.onDismiss(issue)}><i className="fa fa-times" /> {t('Dismiss')}</a> }
        <div className="flex-fill" />
        <a className="btn" href={issue.issueUrl} target="_blank"><i className="fa fa-exclamation-circle" /> {t('issue.File')}</a>
      </div>
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
    app.removeListener('update:issues', this.updateState)
  }

  onDismiss(issue) {
    issue.isRead = true
    this.updateState()
  }

  render() {
    const selected = (this.props.to === this.props.location)
    const modalStyle = {
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
        bottom                     : 'auto',
        left                       : '50%',
        right                      : 'auto',
        maxHeight                  : '90%',
        transform                  : 'translateX(-50%)',
        boxShadow                  : '0px 24px 48px rgba(0, 0, 0, 0.2)',
        borderRadius               : '0',
        border                     : '0',
        background                 : '#fff',
        overflow                   : 'auto',
        WebkitOverflowScrolling    : 'touch',
        outline                    : 'none',
        padding                    : '0'
      }
    }
    let open  = () => this.setState({ isOpen: true  })
    let close = () => this.setState({ isOpen: false })
    if (!this.state.numIssues)
      return <span/>
    return <div className="link">
      <a className="ctrl" onClick={open}>
        <i className="fa fa-exclamation-triangle" /> {t('Issues')} ({this.state.numUnread})
      </a>
      <Modal isOpen={this.state.isOpen} onRequestClose={close} style={modalStyle}>
        {this.state.issues.map((issue, i) => <Issue key={'issue'+i} issue={issue} onDismiss={this.onDismiss.bind(this)} />)}
      </Modal>
    </div>
  }
}