import './SideMenuItemComponent.css';
import React, { useState } from 'react';

function SideMenuItem(props) {
    let isSelected = props.state === props.stateName;

    return (
        <div className={`sideMenuItemContainer ${isSelected ? "selected": ""}`} >
            <div className='itemImageContainer'>
                <img src={props.image} className='itemImages' onClick={() => { props.setState(props.stateName); }}/>
            </div>
            <span>{props.title}</span>
        </div>
    )
}


export default SideMenuItem;
  