'use babel'
import React from 'react'
import Modal from 'react-modal'
import app from '../lib/app'
import TextNodeSearcher from 'text-node-searcher'

export default class FindBar extends React.Component {
  constructor(props) {
    super(props)
    this.searcher = new TextNodeSearcher()
    this.state = {
      isVisible: false
    }
    this.onAppFocusFind = () => {
      this.setState({ isVisible: true })
      const input = this.refs.input
      input.focus()
      input.selectionStart = 0
      input.selectionEnd = input.value.length
    }
  }

  componentDidMount() {
    this.searcher.container = document.getElementById(this.props.for)
    app.on('focus:find', this.onAppFocusFind)
  }
  componentWillUnmount() {
    app.removeListener('focus:find', this.onAppFocusFind)
  }

  onFindKeyDown(e) {
    if (e.keyCode == 13) { // enter
      this.search(!e.shiftKey)
    } else if (e.keyCode == 27) { // escape
      this.setState({ isVisible: false })
    }
  }

  search(forward) {
    this.searcher.setQuery(this.refs.input.value)
    if (forward)
      this.searcher.selectNext();
    else
      this.searcher.selectPrevious();

    // make room for the find bar
    var textNode = window.getSelection().anchorNode;
    if (textNode) {
      for (var node = textNode.parentNode; node; node = node.parentNode) {
        if (node.style && node.style.overflow == 'auto') {
          var bottomMargin = 100;
          node.scrollTop += this.refs.bar.offsetHeight + bottomMargin;
          return;
        }
      }
    }
  }

  onCloseClick(e) {
    this.setState({ isVisible: false })
  }

  render() {
    return <div ref="bar" className={'findbar '+(this.state.isVisible?'':'hidden')}>
      <div className="search"><i className="fa fa-search" /><input ref="input" placeholder="Find" onKeyDown={this.onFindKeyDown.bind(this)} /></div>
      <a className="btn" onClick={this.search.bind(this, false)}><i className="fa fa-angle-up" /></a>
      <a className="btn" onClick={this.search.bind(this, true)}><i className="fa fa-angle-down" /></a>
      <a className="btn close" onClick={this.onCloseClick.bind(this)}>&times;</a>
    </div>
  }
}

