import React from 'react'
import { Trans, useTranslation } from 'react-i18next';
import './SupportComponent.css';

function Support(props) {
    const { t, i18n } = useTranslation();
    return (
        <div class='content impressum'>
            <div className='wrapper_centered_box text'>
                <Trans i18nKey='support' components={{ italic: <i />, bold: <strong />, a: <a />, h1: <h1 /> }}/>
            </div>
        </div>
    )
}


export default Support;
  
  
