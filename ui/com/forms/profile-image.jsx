'use babel'
import React from 'react'
import cls from 'classnames'
import schemas from 'ssb-msg-schemas'
import multicb from 'multicb'
import { rainbow } from '../index'
import ImageInput from '../form-elements/image-input'
import app from '../../lib/app'

function getCurrentImg() {
  const profile = app.users.profiles[app.user.id]
  if (profile && profile.self.image)
    return profile.self.image.link
}

export default class ProfileSetup extends React.Component {  
  constructor(props) {
    super(props)
    this.state = { wasImageAdded: false }
  }

  componentDidMount() {
    this.props.setIsValid(true)
  }

  onChangeImg() {
    // note that the image was set so that vertical centering can be turned off
    this.setState({ wasImageAdded: true })
  }

  getValues(cb) {
    const canvas = this.refs.imageInputContainer.querySelector('canvas')
    if (canvas) {
      ImageInput.uploadCanvasToBlobstore(canvas, (err, hasher) => {
        const imageLink = {
          link: '&'+hasher.digest,
          size: hasher.size,
          type: 'image/png',
          width: 512,
          height: 512
        }
        cb({ image: imageLink })
      })
    } else {
      cb({ image: null })      
    }    
  }

  submit(cb) {
    this.getValues(values => {
      // publish update messages
      var done = multicb()
      if (values.image && values.image.link !== getCurrentImg())
        app.ssb.publish(schemas.image(app.user.id, values.image), done())

      done(err => {
        if (err) return cb(err)

        // if in a flow, just go to next step
        if (this.props.gotoNextStep)
          return cb()

        // single modal, update app state now
        app.fetchLatestState(cb)
      })
    })
  }

  render() {
    const currentImg = getCurrentImg()
    const hasImg = !!currentImg || this.state.wasImageAdded
    const useVerticalCentering = !hasImg // dont vertically center if an image is assigned
    return <div className={cls({ 'text-center': true, 'vertical-center': useVerticalCentering })}>
      <h1><span>Would you like to choose a picture?</span></h1>
      <form className="block" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <div ref="imageInputContainer"><ImageInput current={(currentImg) ? ('http://localhost:7777/' + currentImg) : false} onChange={this.onChangeImg.bind(this)} /></div>
        </fieldset>
      </form>
    </div>
  }
}