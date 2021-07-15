import React from 'react'

import './NumberFieldComponent.css';

class NumberField extends React.Component {

   value = 0;

   constructor(props) {
      super(props);
      this.state = { value: props.value };
      this.value = this.state.value;
      this.onChange = this.onChange.bind(this);
      this.onBlur = this.onBlur.bind(this)
   }

   static getDerivedStateFromProps(props, current_state) {
      if (current_state.value !== props.value) {
         return {
          value: props.value
        }
      }
      return null
    }

    onChange(e) {
      const re = /^(\d*(\.\d+)?)/;
      if (this.state.value !== e.target.value) {
         if (re.test(e.target.value) && !(e.target.value === '')) {
            console.log('HÄÄÄÄÄ', e.target.value)
            //this.props.editor.updateValue(this.props.attribute, e.target.value)
         }
      }
   }

   onBlur(e) {
      const re = /^(\d*(?:\.\d+)?)/;
      if (re.test(e.target.value)) {
         this.props.editor.updateValue(this.props.attribute, e.target.value)
      } else if (!Number.isNaN(parseFloat(e.target.value))) {
         this.props.editor.updateValue(this.props.attribute, this.state.value)
      } else {
         this.props.editor.updateValue(this.props.attribute, 0)
      }
   }

   render() {
      return <input class='attribute' value={this.value} onChange={this.onChange} onBlur={this.onBlur}/>
   }
}

export default NumberField;