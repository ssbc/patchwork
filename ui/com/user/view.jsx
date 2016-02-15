'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
import DropdownBtn from '../dropdown'
import MsgList from '../msg-list'
import Oneline from '../msg-view/oneline'
import { AutoRefreshingComponent, VerticalFilledContainer } from '../index'
import * as UserInfo from './info'
import LeftNav from '../leftnav'
import RightNav from '../rightnav'
import app from '../../lib/app'
import social from '../../lib/social-graph'
import u from '../../lib/util'

const VIEW_ABOUT = { label: <h2>About</h2> }
const VIEW_CONTACTS = { label: <h2>Contacts</h2> }
const VIEW_DATA = { label: <h2>Activity</h2> }
const TABS = [VIEW_ABOUT, VIEW_CONTACTS, VIEW_DATA]

const FLAG_DROPDOWN = [
  { value: 'dead',  label: "Dead Account / Lost Keys" },
  { value: 'spam',  label: "Spammer" },
  { value: 'abuse', label: "Abusive Behavior" }
]

export default class UserView extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      currentTabIndex: (this.state) ? this.state.currentTabIndex : 0,
      hasFlagged: social.flags(app.user.id, pid)
    }
  }

  getTabs() {
    return TABS
  }

  onSelectTab(tab) {
    const tabs = this.getTabs()
    this.setState({ currentTabIndex: tabs.indexOf(tab) })
  }

  onSend() {
    this.refs.list.reload()
  }

  onFlag(reason) {
    // publish vote message
    const voteMsg = schemas.vote(this.props.pid, -1, reason)
    app.ssb.publish(voteMsg, err => {
      if (err)
        return app.issue('Failed to publish flag', err, 'Happened when the user used the flag modal in the profile')
      app.fetchLatestState()
    })
  }

  onUnflag() {
    // publish vote message
    const voteMsg = schemas.vote(this.props.pid, 0)
    app.ssb.publish(voteMsg, err => {
      if (err)
        return app.issue('Failed to publish update', err, 'Happened when the user used the unflag button in the profile')
      app.fetchLatestState()
    })
  }

  render() {
    // HACK
    // there's too much built into the MsgList component, but I dont have time to refactor
    // until MsgList can be decomposed:
    // - render 1 way for about, and a different way for msg lists
    // - use the hero and toolbar attributes to maintain consistency (really shouldnt be part of MsgList)
    // - also, abuse the key attr on MsgList to get a rerender on view change
    const tabs = this.getTabs()
    const currentTab = tabs[this.state.currentTabIndex] || tabs[0]
    const Hero = (props) => {
      return <div>
        <UserInfo.Header key={this.props.pid} pid={this.props.pid} tabs={tabs} currentTab={currentTab} onSelectTab={this.onSelectTab.bind(this)} />
      </div>
    }

    const ThisRightNav = props => {
      return <RightNav>
        <hr className="labeled" data-label="this user" />
        { (this.state.hasFlagged) ?
          <a className="btn" onClick={this.onUnflag.bind(this)}><i className="fa fa-flag" /> Unflag this user</a> :
          <DropdownBtn className="btn" items={FLAG_DROPDOWN} right onSelect={this.onFlag.bind(this)}><i className="fa fa-flag" /> Flag this user</DropdownBtn>  }
      </RightNav>
    }

    if (currentTab === VIEW_ABOUT) {
      return <VerticalFilledContainer className="user-profile flex" key={this.props.pid}>
        <LeftNav location={this.props.location} />
        <div className="flex-fill">
          <Hero />
          <div className="user-profile-about">
            <UserInfo.Flags pid={this.props.pid} />
            <UserInfo.Names pid={this.props.pid} />
            <UserInfo.Pics pid={this.props.pid} />
            <UserInfo.Data pid={this.props.pid} />
          </div>
        </div>
        <ThisRightNav />
      </VerticalFilledContainer>
    }
    if (currentTab === VIEW_CONTACTS) {
      return <VerticalFilledContainer className="user-profile flex" key={this.props.pid}>
        <LeftNav location={this.props.location} />
        <div className="flex-fill">
          <Hero />
          <div className="user-profile-contacts">
            <UserInfo.Contacts pid={this.props.pid} />
          </div>
        </div>
        <ThisRightNav />
      </VerticalFilledContainer>
    }

    // normal msg-list render
    const name = u.getName(this.props.pid)
    const isSelf = this.props.pid == app.user.id
    const feed = opts => {
      opts = opts || {}
      opts.id = this.props.pid
      return app.ssb.createUserStream(opts)
    }
    const cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
    const composerProps = (isSelf)
      ? { isPublic: true, placeholder: 'Write a new public post', onSend: this.onSend.bind(this) }
      : { isPublic: false, recps: [this.props.pid], placeholder: 'Write a private message to '+name, onSend: this.onSend.bind(this) }
  
    // MsgList must have refreshOnReply
    // - Why: in other views, such as the inbox view, a reply will trigger a new message to be emitted in the livestream
    // - that's not the case for `createUserStream`, so we need to manually refresh a thread on reply
    return <div className="user-profile" key={this.props.pid + (currentTab === VIEW_DATA ? 'data' : 'posts')}>
      <MsgList
        ref="list"
        key={currentTab.label}
        dateDividers
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={ThisRightNav}
        ListItem={Oneline}
        Hero={Hero}
        source={feed}
        cursor={cursor}
        refreshOnReply />
    </div>
  }
}