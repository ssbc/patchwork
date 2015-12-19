'use babel'
import React from 'react'
import Modal from 'react-modal'
import TextNodeSearcher from 'text-node-searcher'
import u from '../lib/util'

export default class FindBar extends React.Component {
  constructor(props) {
    super(props)
    this.searcher = new TextNodeSearcher({
      highlightTagName: 'highlight'
    })
    this.state = {
      isVisible: false
    }
    this.highlightDebounced = u.debounce(() => {
      this.searcher.setQuery(this.refs.input.value)
      this.searcher.highlight()
    }, 75)
  }

  componentDidMount() {
    this.searcher.container = document.getElementById(this.props.for)
  }

  focus() {
    this.setState({ isVisible: true })
    const input = this.refs.input
    input.focus()
    input.selectionStart = 0
    input.selectionEnd = input.value.length
  }

  onFindKeyDown(e) {
    if (e.keyCode == 13) { // enter
      this.search(!e.shiftKey)
    } else if (e.keyCode == 27) { // escape
      this.close();
    } else {
      this.highlightDebounced()
    }
  }

  search(forward) {
    this.searcher.setQuery(this.refs.input.value)
    this.searcher.highlight();
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

  close() {
    this.setState({ isVisible: false })
    this.searcher.unhighlight();
  }

  render() {
    return <div ref="bar" className={'findbar '+(this.state.isVisible?'':'hidden')}>
      <div className="search"><i className="fa fa-search" /><input ref="input" placeholder="Find" onKeyDown={this.onFindKeyDown.bind(this)} /></div>
      <a className="btn" onClick={this.search.bind(this, false)}><i className="fa fa-angle-up" /></a>
      <a className="btn" onClick={this.search.bind(this, true)}><i className="fa fa-angle-down" /></a>
      <a className="btn close" onClick={this.close.bind(this)}>&times;</a>
    </div>
  }
}

