import React, { useRef, useState } from 'react'
import ReactDOM from 'react-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import './index.css';
import './react-tabs-custom.css';
import Upload from "./UploadComponent"
import About from "./AboutComponent"
import SceneWithSpinningBoxes from "./EditComponent";

ReactDOM.render(
  <React.StrictMode>
  <Tabs>
    <TabList>
      <Tab>Image-2-Mesh</Tab>
      <Tab>About</Tab>
      <Tab>Download</Tab>
      <Tab>Edit</Tab>
    </TabList>

    <TabPanel>
      <Upload></Upload>
    </TabPanel>
    <TabPanel>
      <About></About>
    </TabPanel>
    <TabPanel>
    </TabPanel>
    <TabPanel>
      <SceneWithSpinningBoxes></SceneWithSpinningBoxes>
    </TabPanel>
  </Tabs>
  </React.StrictMode>,
  document.getElementById('root')
);
