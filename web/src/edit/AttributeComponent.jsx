import React, { useRef, useEffect }  from 'react'
import NumberField from './NumberFieldComponent';

import './AttributeComponent.css';

function Attribute(props) {
    return (
        <div className='attribute_wrapper'>
            {props.name}
            <div className='numberfields'>
            <NumberField value={props.x} attribute={props.name+'X'} editor={props.editor}></NumberField>
            <NumberField value={props.y} attribute={props.name+'Y'} editor={props.editor}></NumberField>
            <NumberField value={props.z} attribute={props.name+'Z'} editor={props.editor}></NumberField>
            </div>
        </div>
    ) 
};

export default Attribute;