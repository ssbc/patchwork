import React from 'react'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import MsgList from '../msg-list'
import Summary from '../msg-view/summary'
import Thread from '../msg-thread'
import ResponsiveElement from '../responsive-element'

export default class SimpleMsgList extends MsgList {
  render() {
    const ListItem = this.props.ListItem || Summary
    const isEmpty = (!this.state.isLoading && this.state.msgs.length === 0)

    // render messages here, into an array, so we can insert date dividers
    var listEls = []
    this.state.msgs.forEach((m, i) => {
      // missing value?
      if (!m.value)
        return // dont render

      // render item
      if (m.isOpened) {
        listEls.push(
          <Thread
            key={m.key}
            id={m.key}
            onMsgChange={this.handlers.onMsgChange}
            onClose={() => this.handlers.onCloseThread(m)}
            live />
        )
      } else {
        listEls.push(
          <ListItem
            key={m.key}
            msg={m}
            selectiveUpdate
            {...this.handlers}
            {...this.props.listItemProps}
            forceRaw={this.props.forceRaw} />
        )
      }
    })

    return <div className="msg-list">
      <div className="msg-list-items">
        { this.state.msgs.length === 0 && this.state.isLoading ? <div style={{fontWeight: 300, textAlign: 'center'}}>Loading...</div> : '' }
        { isEmpty && (this.props.emptyMsg !== false) ?
          <div className="empty-msg">
            { (this.props.emptyMsg || 'No messages.') }
          </div>
          :
          <ResponsiveElement widthStep={250}>
            <ReactCSSTransitionGroup component="div" transitionName="fade" transitionAppear={true} transitionAppearTimeout={500} transitionEnterTimeout={500} transitionLeaveTimeout={1}>
              { listEls }
            </ReactCSSTransitionGroup>
          </ResponsiveElement>
        }
      </div>
    </div>

  }
}