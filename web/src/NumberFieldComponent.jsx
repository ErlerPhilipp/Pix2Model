import React, { useRef, useState } from 'react'

class NumberField extends React.Component{
    constructor(){
       super();
       this.state = {value: ''};
       this.onChange = this.onChange.bind(this)
    }
    
    onChange(e){
       const re = /^[0-9\b]+$/;
       if (e.target.value === '' || re.test(e.target.value)) {
          this.setState({value: e.target.value})
       }
    }
    
    render(){
      return <input value={this.state.value} onChange={this.onChange}/>
    }
 }

 export default NumberField;