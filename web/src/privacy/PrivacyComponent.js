import React, { Component } from 'react'
import { Trans, useTranslation } from 'react-i18next';
import './PrivacyComponent.css';

function Privacy(props) {
    const { t, i18n } = useTranslation();
    return (
        <div class='content privacy'>
            <div className='wrapper_centered_box text'>
                <Trans i18nKey='privacy' components={{ italic: <i />, bold: <strong />, a: <a />, h1: <h1 /> }}/>
            </div>
        </div>
    )
}


export default Privacy;
  
