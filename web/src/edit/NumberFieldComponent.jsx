import React from 'react'

import './NumberFieldComponent.css';

class NumberField extends React.Component {

   constructor(props) {
      super(props);
      this.state = { value: props.value };
      this.onChange = this.onChange.bind(this);
      this.onBlur = this.onBlur.bind(this)
   }

   componentDidUpdate(prevProps) {
      if (prevProps.value !== this.props.value) {
         this.setState({value: this.props.value})
      }
   }

   onChange(e) {
      if (this.state.value !== e.target.value) {
         this.setState({value: e.target.value});
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
      return <input class='attribute' value={this.state.value} onChange={this.onChange} onBlur={this.onBlur}/>
   }
}

export default NumberField;