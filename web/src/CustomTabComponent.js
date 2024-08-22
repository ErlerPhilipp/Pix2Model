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
import Support from './support/SupportComponent';
import SideMenuItem from './sideMenu/SideMenuItemComponent'

import './index.css';


function CustomTabs() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState('upload')
  const [index, setIndex] = useState(new URLSearchParams(window.location.search).get('page') ? new URLSearchParams(window.location.search).get('page') : 0);
  const [load_id, setLoadId] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSetState = (newState) => {
    setState(newState);
    closeMenu();
  };

  const handleStateChange = (state) => {
    setMenuOpen(state.isOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  function handleChangeLang(lang) {
    i18n.changeLanguage(lang)
  }

  function handleChange(event, value) {
    setIndex(value);
  };

  function handleChangeIndex(index) {
    setIndex(index);
  };

  function onLoadIdPressed(){
    if(state==="mesh"){
      handleSetState("pointcloud");
    }else{
      handleSetState("mesh"); 
    }
  }

  return (
    <React.StrictMode>
      <BrowserView>
        <div className="Root">
          <Tabs
            value={index}
            fullwidth="true"
            onChange={handleChange}
            TabIndicatorProps={{style: {backgroundColor: "white"}}}>
            <Tab label="Pix-2-Model (Beta)"/>
            <Tab label={t('menu.edit')}/>
            <Tab icon={t('menu.about')}/>
          </Tabs>
          <button className='lang en' onClick={() => handleChangeLang('en')}>EN</button>
          <button className='lang de' onClick={() => handleChangeLang('de')}>DE</button>
          <SwipeableViews index={index} disabled={true} onChangeIndex={handleChangeIndex} enableMouseEvents={true}>
            <div className='swipable_content'>
              <Upload></Upload>
            </div>
            <div className='swipable_content'>
              <Edit></Edit>
            </div>
            <div className='swipable_content'>
              <About></About>
            </div>
            <div className='swipable_content'>
              <Support></Support>
            </div>
            <div className='swipable_content'>
              <Privacy></Privacy>
            </div>
            <div className='swipable_content'>
              <Impressum></Impressum>
            </div>
          </SwipeableViews>
          <footer className="footer">
            <button onClick={() => setIndex(5)}>{t('footer.impressum')}</button>
            <button onClick={() => setIndex(4)}>{t('footer.privacy')}</button>
            <button onClick={() => setIndex(3)}>{t('footer.support')}</button>
          </footer>
        </div>
      </BrowserView>
      <MobileView>
        <div className='mobile_wrapper'>
          <Menu 
          isOpen={menuOpen}
          onStateChange={(state) => handleStateChange(state)}>
            <SideMenuItem title="Upload" image="images.png" stateName="upload" state={state} setState={handleSetState} ></SideMenuItem>
            <SideMenuItem title="Pointcloud" image="ply.png" stateName="pointcloud" state={state} setState={handleSetState} ></SideMenuItem>
            <SideMenuItem title="Mesh" image="mesh.png" stateName="mesh" state={state} setState={handleSetState} ></SideMenuItem>
            <div className="id_container">
              <input id="uuid"></input>
              <button className="button_small" onClick={() => { onLoadIdPressed(); closeMenu(); }}>{t('upload.loadPointcloud')}</button>
            </div>
            <button id="uuid_error" className="edit_warning"></button>
            <div className="icon_container">
              <a href="#" onClick={(e) => { e.preventDefault(); handleSetState("support"); closeMenu();}}><img alt="info" src="icon_info.svg"/></a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSetState("impressum"); closeMenu();}}><img alt="impressum" src="icon_impressum.svg"/></a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSetState("privacy"); closeMenu();}}><img alt="privacy" src="icon_privacy.svg"/></a>
              <a href="#" onClick={(e) => { e.preventDefault(); handleSetState("about"); closeMenu();}}><img alt="about" src="icon_about.svg"/></a>
            </div>
          </Menu>
          {state === 'upload' && (
            <Upload></Upload>
          )}
          {state === 'pointcloud' && (
            <Edit load_id={load_id} step="pointcloud" ></Edit>
          )}
          {state === 'mesh' && (
            <Edit load_id={load_id} step="mesh" ></Edit>
          )}
          {state === 'support' && (
            <Support></Support>
          )}
          {state === 'impressum' && (
            <Impressum></Impressum>
          )}
          {state === 'privacy' && (
            <Privacy></Privacy>
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