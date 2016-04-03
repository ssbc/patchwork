'use babel'
import React from 'react'
import ReactDOM from 'react-dom'
import { Link } from 'react-router'
import xtend from 'xtend'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

// parent class for components which should persist their state to localstorage
// - subclasses must call super(props, storageId), where `storageId` is the localStorage key
// - subclasses should provide defaultState to set which values are persisted, and give initial values
export class LocalStoragePersistedComponent extends React.Component {
  constructor(props, storageId, defaultState) {
    super(props)
    
    // load state from local storage
    this.storageId = storageId
    try { this.state = JSON.parse(localStorage[this.storageId]) }
    catch(e) { this.state = {} }

    // write any missing state props from default state
    this.persistKeys = Object.keys(defaultState)
    for (var k in defaultState) {
      if (!(k in this.state))
        this.state[k] = defaultState[k]
    }
  }

  setState(obj, cb) {
    // override to persist to local storage
    super.setState(obj, (prevState, currentProps) => {
      // extract only the persisted keys
      var saveState = {}
      this.persistKeys.forEach(k => saveState[k] = this.state[k])

      // store
      localStorage[this.storageId] = JSON.stringify(saveState)
      cb && cb(prevState, currentProps)
    })
  }
}
// parent class for components which should recompute their state every time the app-state changes
export class AutoRefreshingComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.computeState(props)
    this.refreshState = () => { this.setState(this.computeState(this.props)) }
  }
  componentDidMount() {
    app.on('update:all', this.refreshState) // re-render on app state updates
  }
  componentWillReceiveProps(newProps) {
    this.refreshState(newProps)
  }
  componentWillUnmount() {
    app.removeListener('update:all', this.refreshState)    
  }
  computeState(props) {
    // should be overwritten by sublcass
  }
}

// higher-order component, adds vertical-filling behavior (take all vertical space possible)
export function verticalFilled (Component) {
  const VerticalFilledCom = React.createClass({
    getInitialState() {
      return { height: window.innerHeight }
    },
    componentDidMount() {
      this.calcHeight()
      this.historyScrollTo()
      this.resizeListener = this.calcHeight
      window.addEventListener('resize', this.resizeListener)
    },
    componentWillUnmount() {
      window.removeEventListener('resize', this.resizeListener)
    },
    calcHeight() {
      var height = window.innerHeight
      if (this.refs && this.refs.el) {
        var rect = ReactDOM.findDOMNode(this.refs.el).getClientRects()[0]
        if (!rect)
          return
        height = window.innerHeight - rect.top
      }
      this.setState({ height: height })
    },
    getScrollTop() {
      const el = this.refs && this.refs.el
      if (!el) return 0
      if (el.getScrollTop)
        return el.getScrollTop() // use the child's impl
      return el.scrollTop
    },
    // check if a location is in scroll-view
    isPointVisible(left, top) {
      const el = this.refs && this.refs.el
      if (!el) return
      if (el.isPointVisible)
        return el.isPointVisible(left, top) // use the child's impl

      // TODO left

      if (el.scrollTop > top || el.scrollTop + this.state.height < top)
        return false

      return true
    },
    scrollTo(top) {
      const el = this.refs && this.refs.el
      if (!el) return
      if (el.scrollTo)
        return el.scrollTo(top) // use the child's impl

      // make sure it scrolls (may need some loading time)
      var n = 0
      const el2 = ReactDOM.findDOMNode(this.refs.el)
      function doit () {
        el2.scrollTop = top
        if (el2.scrollTop != top && ++n < 100)
          setTimeout(doit, 10)
      }
      doit()
    },
    historyScrollTo() {
      if (!this.props.id)
        return // we dont have an id, no scrolltop to record
      if (!history.state)
        return // no state in the history
      const vfScrollTops = history.state.vfScrollTops
      if (!vfScrollTops || !vfScrollTops[this.props.id])
        return // no scrolltop in the history for this one
      this.scrollTo(vfScrollTops[this.props.id])
    },
    render() {
      return <Component ref="el" {...this.props} {...this.state} />
    }
  })
  return VerticalFilledCom;
}
class _VerticalFilledContainer extends React.Component {
  render() {
    return <div className="vertical-filled" {...this.props} style={{position: 'relative', height: this.props.height, overflow: 'auto'}}>{this.props.children||''}</div>
  }
}
export var VerticalFilledContainer = verticalFilled(_VerticalFilledContainer)