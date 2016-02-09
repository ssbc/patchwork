'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import Tabs from '../tabs'
import MsgList from '../msg-list'
import Oneline from '../msg-view/oneline'
import { VerticalFilledContainer } from '../index'
import { UserInfoHeader, UserInfoContacts, UserInfoFlags } from './info'
import LeftNav from '../leftnav'
import app from '../../lib/app'
import u from '../../lib/util'

const VIEW_POSTS = { label: <h2>Posts</h2> }
const VIEW_CONTACTS = { label: <h2>Contacts</h2> }
const VIEW_DATA = { label: <h2>Data</h2> }
const TABS = [VIEW_POSTS, VIEW_CONTACTS, VIEW_DATA]

export default class UserView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      currentTabIndex: 0
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
        <UserInfoHeader key={this.props.pid} pid={this.props.pid} />
        <Tabs className="user-info-tabs" options={tabs} selected={currentTab} onSelect={this.onSelectTab.bind(this)} />
      </div>
    }

    if (currentTab === VIEW_CONTACTS) {
      // TODO <UserInfoFlags pid={this.props.pid} />
      return <VerticalFilledContainer className="user-profile flex" key={this.props.pid}>
        <LeftNav location={this.props.location} />
        <div className="flex-fill">
          <Hero />
          <div className="user-profile-about">
            <UserInfoContacts pid={this.props.pid} />
          </div>
        </div>
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
    const forceRaw = (currentTab === VIEW_DATA)
    const filter = (currentTab === VIEW_POSTS)
        ? (msg) => {      
          // toplevel post by this user, private or public
          var c = msg.value.content
          if (c.type == 'post' && !(c.root || c.branch))
            return true
        }
        : () => true // allow all
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
        threads
        dateDividers
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        composer composerProps={composerProps}
        forceRaw={forceRaw}
        ListItem={Oneline}
        Hero={Hero}
        source={feed}
        cursor={cursor}
        filter={filter}
        refreshOnReply />
    </div>
  }
}