'use babel'
import React from 'react'
import cls from 'classNames'
import { getResults } from '../lib/search'

const KEYCODE_UP = 38
const KEYCODE_DOWN = 40
const KEYCODE_ENTER = 13

function boundary (v, low, high) {
  return Math.min(Math.max(v, low), high)
}

class SearchResults extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selected: false
    }
  }

  onMouseOverResult(index) {
    this.setState({ selected: index })
  }

  moveSelection(direction) {
    if (this.state.selected === false) {
      // nothing selected yet, go to first result
      this.setState({ selected: 0 })
    } else {
      // update within bounds of current results
      this.setState({
        selected: boundary(this.state.selected + direction, 0, this.props.results.length - 1)
      })
    }
  }

  getSelectedResult() {
    return this.props.results[this.state.selected] || this.props.results[0]
  }

  render() {
    const Result = props => {
      return <div className={cls({ selected: this.state.selected === props.index })} onMouseOver={this.onMouseOverResult.bind(this, props.index)}>
        <i className={'fa fa-'+props.icon} /> {props.label}
      </div>
    }
    return <div className="search-palette-results">
      { this.props.results.map((r, i) => <Result key={i} index={i} {...r} />) }
    </div>
  }
}

export default class SearchPalette extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      query: '',
      results: []
    }
    this.unlistenBefore = app.history.listenBefore(this.onBeforeNavigation.bind(this))
  }
  componentWillUnmount() {
    this.unlistenBefore()
  }

  onBeforeNavigation() {
    this.setState({ query: '', results: [] })
  }

  onChange(e) {
    // update query & results
    const query = e.target.value
    this.setState({
      query: query,
      results: (query) ? getResults(query) : []
    })
  }

  onKeyDown(e) {
    // enter query
    if (e.keyCode == KEYCODE_ENTER) {
      this.onSearch()
      e.preventDefault()
    }

    // navigate results
    if (e.keyCode == KEYCODE_UP && this.refs.results) {
      this.refs.results.moveSelection(-1)
      e.preventDefault()
    }
    if (e.keyCode == KEYCODE_DOWN && this.refs.results) {
      this.refs.results.moveSelection(1)
      e.preventDefault()
    }
  }

  onSearch() {
    this.refs.results.getSelectedResult().fn(this.state.query)    
  }

  render() {
    const hasQuery = !!this.state.query
    return <div className="search-palette">
      <i className="fa fa-search" />
      <input 
        ref="search"
        placeholder="Search for people or content"
        value={this.state.query}
        onChange={this.onChange.bind(this)}
        onKeyDown={this.onKeyDown.bind(this)} />
      { hasQuery ? <SearchResults ref="results" query={this.state.query} results={this.state.results} /> : '' }
    </div>
  }
}