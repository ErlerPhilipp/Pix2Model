import React from 'react'
import ReactDOM from 'react-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import './index.css';
import './react-tabs-custom.css';

import Upload from "./upload/UploadComponent"
import UploadPLY from "./uploadPLY/UploadPLYComponent"
import About from "./about/AboutComponent"
import Edit from "./edit/EditComponent";
import Download from "./download/DownloadComponent";


ReactDOM.render(
  <React.StrictMode>
  <div className="Root">
  <Tabs>
    <TabList>
      <Tab>Image-2-Mesh</Tab>
      <Tab>Ply-2-Mesh</Tab>
      <Tab>About</Tab>
      <Tab>Download</Tab>
      <Tab>Edit</Tab>
    </TabList>

    <TabPanel>
      <Upload></Upload>
    </TabPanel>
    <TabPanel>
      <UploadPLY></UploadPLY>
    </TabPanel>
    <TabPanel>
      <About></About>
    </TabPanel>
    <TabPanel>
      <Download></Download>
    </TabPanel>
    <TabPanel>
      <Edit></Edit>
    </TabPanel>
  </Tabs>
  </div>
  </React.StrictMode>,
  document.getElementById('root')
);