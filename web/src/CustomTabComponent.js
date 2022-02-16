import SwipeableViews from 'react-swipeable-views';
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import { BrowserView, MobileView } from 'react-device-detect';
import { slide as Menu } from 'react-burger-menu'

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Upload from "./upload/UploadComponent"
import About from "./about/AboutComponent"
import Edit from "./edit/EditComponent";
import Impressum from './impressum/ImpressumComponent';
import Privacy from './privacy/PrivacyComponent';

import './index.css';


function CustomTabs() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState('upload')
  const [index, setIndex] = useState(0);

  function handleChangeLang(lang) {
    i18n.changeLanguage(lang)
  }

  function handleChange(event, value) {
    setIndex(value);
  };

  function handleChangeIndex(index) {
    setIndex(index);
  };

  return (
      <React.StrictMode>
        <BrowserView>
          <div className="Root">
          <Tabs
              value={index}
              fullWidth
              onChange={handleChange}
              TabIndicatorProps={{style: {backgroundColor: "white"}}}>
              <Tab label="Pics-2-Model (Beta)"/>
              <Tab label={t('menu.edit')}/>
              <Tab icon={t('menu.about')}/>
          </Tabs>
          <button class='lang en' onClick={() => handleChangeLang('en')}>EN</button>
          <button class='lang de' onClick={() => handleChangeLang('de')}>DE</button>
          <SwipeableViews index={index} disabled={true} onChangeIndex={handleChangeIndex} enableMouseEvents={true}>
              <div class='swipable_content'>
                  <Upload></Upload>
              </div>
              <div class='swipable_content'>
                  <Edit></Edit>
              </div>
              <div class='swipable_content'>
                  <About></About>
              </div>
              <div class='swipable_content'>
                  <Privacy></Privacy>
              </div>
              <div class='swipable_content'>
                  <Impressum></Impressum>
              </div>
          </SwipeableViews>
          <footer className="footer">
              <button onClick={() => setIndex(4)}>{t('footer.impressum')}</button>
              <button onClick={() => setIndex(3)}>{t('footer.privacy')}</button>
          </footer>
          </div>
        </BrowserView>
        <MobileView>
          <div class='mobile_wrapper'>
            <Menu>
              <a id="home" className="menu-item" onClick={() => { setState('upload')}}>Image-2-Mesh</a>
              <a id="about" className="menu-item" onClick={() => { setState('edit')}}>{t('menu.edit')}</a>
              <a id="contact" className="menu-item" onClick={() => { setState('about')}}>{t('menu.about')}</a>
            </Menu>
              {state === 'upload' && (
                <Upload></Upload>
              )}
              {state === 'edit' && (
                <Edit></Edit>
              )}
              {state === 'about' && (
                <About></About>
              )}
            </div>
        </MobileView>
      </React.StrictMode>
    );
  }
  
  export default CustomTabs;