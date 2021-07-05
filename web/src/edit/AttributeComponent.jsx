import React from 'react'
import NumberField from './NumberFieldComponent';

import './AttributeComponent.css';

function Attribute(props) {
    return (
        <div class='attribute_wrapper'>
            {props.name}
            <div class='numberfields'>
            <NumberField value={props.x}></NumberField>
            <NumberField value={props.y}></NumberField>
            <NumberField value={props.z}></NumberField>
            </div>
        </div>
    )
};

export default Attribute;