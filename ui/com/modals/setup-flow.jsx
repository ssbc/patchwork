'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import ModalFlow from './flow'
import { SetupForm } from '../forms'
import app from '../../lib/app'

export default class SetupFlow extends ModalFlow {
  constructor(props) {
    super(props)
    function rainbow (str) {
      return <span className="rainbow">{str.split('').map((c,i) => <span key={i}>{c}</span>)}</span>
    }
    this.steps = [
      {
        label: 'Profile',
        render: () => {
          return <div>
            <h1>Welcome to {rainbow('Patchwork')}</h1>
            <SetupForm ref="form" onValidChange={this.onValidChange.bind(this)} />
          </div>
        },
        onSubmit: this.onSubmitProfile.bind(this)
      },
      {
        label: 'Nearby',
        render: () => {
          return <h1>Connect with {rainbow('Nearby Friends')}</h1>
        }
      },
      {
        label: 'Pubs',
        render: () => {
          return <h1>Connect with {rainbow('Pubs')}</h1>
        }
      }
    ]
  }

  onValidChange(valid) {
    this.setState({ canProgress: valid })
  }

  onSubmitProfile() {
    this.refs.form.getValues(values => {
      let n = 0, m = 0
      const cb = () => {
        m++
        return (err) => {
          if (err) app.issue('Error While Publishing', err, 'Setup modal publishing new about msg')
          else if (++n >= m)
            this.gotoNextStep()
        }
      }
      if (values.name)
        app.ssb.publish(schemas.name(app.user.id, values.name), cb())
      if (values.image)
        app.ssb.publish(schemas.image(app.user.id, values.image), cb())
    })
  }
}
