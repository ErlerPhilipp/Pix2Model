import React from 'react'

import './NumberFieldComponent.css';

class NumberField extends React.Component {
   constructor(props) {
      super(props);
      this.state = { value: props.value };
      this.onChange = this.onChange.bind(this);
      this.onBlur = this.onBlur.bind(this)
   }

   /*
   static getDerivedStateFromProps(props, current_state) {
      if (current_state.value !== props.value) {
        return {
          value: props.value
        }
      }
      return null
    }*/

    onChange(e) {
      const re = /^[0-9\b]+$/;
      if (e.target.value === '' || re.test(e.target.value)) {
         this.setState({ value: e.target.value })
      }
   }

   onBlur(e) {
      this.props.editor.updateValue(this.props.attribute, e.target.value)
   }

   render() {
      return <input class='attribute' value={this.state.value} onChange={this.onChange} onBlur={this.onBlur}/>
   }
}

export default NumberField;