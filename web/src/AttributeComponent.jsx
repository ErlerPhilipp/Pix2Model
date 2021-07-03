import React from 'react'
import NumberField from './NumberFieldComponent';

function Attribute(props) {
    return (
        <div class='attribute'>
            {props.name} :
            <NumberField></NumberField>
            <NumberField></NumberField>
            <NumberField></NumberField>
        </div>
    )
};

export default Attribute;