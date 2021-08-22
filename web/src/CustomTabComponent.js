import SwipeableViews from 'react-swipeable-views';
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import React from 'react'
import ReactDOM from 'react-dom';

import Upload from "./upload/UploadComponent"
import UploadPLY from "./uploadPLY/UploadPLYComponent"
import About from "./about/AboutComponent"
import Edit from "./edit/EditComponent";
import Download from "./download/DownloadComponent";

class CustomTabs extends React.Component {
    state = {
      index: 0
    };
  
    handleChange = (event, value) => {
      this.setState({
        index: value
      });
    };
  
    handleChangeIndex = (index) => {
      this.setState({
        index
      });
    };
  
    render() {
      const { index } = this.state;
  
      return (
        <React.StrictMode>
        <div className="Root">
        <Tabs
            value={index}
            fullWidth
            onChange={this.handleChange}
            TabIndicatorProps={{style: {backgroundColor: "white"}}}>
            <Tab label="About"/>
            <Tab label="Image-2-Mesh"/>
            <Tab label="Ply-2-Mesh"/>
            <Tab label="Download"/>
            <Tab label="Edit"/>
        </Tabs>
        <SwipeableViews index={index} onChangeIndex={this.handleChangeIndex} enableMouseEvents={true}>
            <div>
                <About></About>
            </div>
            <div>
                <Upload></Upload>
            </div>
            <div>
                <UploadPLY></UploadPLY>
            </div>
            <div>
                <Download></Download>
            </div>
            <div>
                <Edit></Edit>
            </div>
        </SwipeableViews>
        </div>
        </React.StrictMode>
      );
    }
  }
  
  export default CustomTabs;