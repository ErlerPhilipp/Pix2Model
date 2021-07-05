import React, { useRef, useState } from 'react'

import './NumberFieldComponent.css';

class NumberField extends React.Component {
   constructor(props) {
      super(props);
      this.state = { value: props.value };
      this.onChange = this.onChange.bind(this)
   }

   onChange(e) {
      const re = /^[0-9\b]+$/;
      if (e.target.value === '' || re.test(e.target.value)) {
         this.setState({ value: e.target.value })
      }
   }

   render() {
      return <input class='attribute' value={this.state.value} onChange={this.onChange} />
   }
}

export default NumberField;