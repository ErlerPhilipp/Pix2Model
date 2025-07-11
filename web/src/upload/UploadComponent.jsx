import 'dropzone/dist/dropzone.css'
import './UploadComponent.css';
import LoadingScreen from './LoadingComponent.jsx'
import React, { Component, useState } from 'react';
import Dropzone from 'dropzone'
import axios from 'axios';
import { BrowserView, MobileView } from 'react-device-detect';

import { withTranslation } from 'react-i18next';

class Upload extends Component {

  constructor(props){
    super(props);
    Dropzone.autoDiscover = false;
    this.state = {
      success: false,
      SFMisLoading: false,
      MESHisLoading: false,
      currentPipeState: 'SFM',
      currentSFMJobPosition: 0,
      currentMeshJobPosition: 0,
      status: 'Queued', // can be '' for processing or 'Queued' for position in queue
      id: '',
      mesh_job_id: ''
    };
  }

  init() {
    const that = this
    setTimeout(function() {
      const { t } = that.props;
      var dropzoneOptions = {
        paramName: "file",
        autoProcessQueue: false,
        uploadMultiple: true,
        parallelUploads: 130,
        maxFilesize: 50,
        maxFiles: 130,
        acceptedFiles: ".png, .jpg, .jpeg",
        dictDefaultMessage: "Drop files here to upload<br/><small>Max 130 files, 10MB per file</small>",
        addRemoveLinks: true
      };
      var uploader = document.querySelector('#upload');
      Dropzone.prototype.cancelUpload = function (file) {
        var groupedFile, groupedFiles, _i, _j, _len, _len1, _ref;
        if (file.status === Dropzone.UPLOADING) {
            this.emit("canceled", file);
        } else if ((_ref = file.status) === Dropzone.ADDED || _ref === Dropzone.QUEUED) {
            file.status = Dropzone.CANCELED;
            this.emit("canceled", file);
            if (this.options.uploadMultiple) {
                this.emit("canceledmultiple", [file]);
            }
        }
        if (this.options.autoProcessQueue) {
            return this.processQueue();
        }
      };
      that.dropzone = new Dropzone(uploader, dropzoneOptions);
      const submitButton = document.querySelector("#submit_upload");
      submitButton.addEventListener("click", eventArgs => {
          if (document.querySelector("#upload").dropzone.files.length > 0) {
            document.querySelector("#upload").dropzone.processQueue();
            document.querySelector("#upload").dropzone.removeEventListeners();
          }
      });
      document.querySelector("#upload").dropzone.on("sending", function(file, xhr, data) {
          if (data) {
            //data.append("user_email", document.querySelector("#email").value);
            data.append("step2", + "1"); /*!document.querySelector("#ply").checked);*/
          }
      });
      document.querySelector("#upload").dropzone.on("success", (file, response) => {
          document.querySelector("#upload").dropzone.setupEventListeners();
          // response[0] => 'data/id...', response[1] => 'id'
          //that.setState({success: true, isLoading: true, id: response.replace('data/','')})
          console.log("Upload Response: ", response)

          that.setState({success: true, SFMisLoading: true, id: response['sfm_job_id'][0].replace('data/',''), mesh_job_id: response['mesh_job_id'][0]})
          that.startJobStatusRequest()
          submitButton.disablwrapper_uploaded = true;
          //var refresh = window.location.protocol + "//" + window.location.host + window.location.pathname + `?id=${response.replace('data/','')}`;    
          var refresh = window.location.protocol + "//" + window.location.host + window.location.pathname + `?id=${response['sfm_job_id'][0].replace('data/','')}`;    
          window.history.pushState({ path: refresh }, '', refresh);
          //document.querySelector("#response_field").innerHTML = `${t('upload.success')}<a href="${window.location.protocol + "//" + window.location.host + window.location.pathname}?id=${response.replace('data/','')}&page=1">${window.location.protocol + "//" + window.location.host + window.location.pathname}?id=${response.replace('data/','')}&page=1</a>`;
          document.querySelector("#response_field").innerHTML = `${t('upload.success')}<a href="${window.location.protocol + "//" + window.location.host + window.location.pathname}?id=${response['sfm_job_id'][0].replace('data/','')}&page=1">${window.location.protocol + "//" + window.location.host + window.location.pathname}?id=${response['sfm_job_id'][0].replace('data/','')}&page=1</a>`;
        });
    }, 0);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.t !== prevProps.t && this.dropzone) {
      // change the default dict for the dropdown
    }
  }

  componentDidMount() {
    if (!this.state.success) {
      this.init();
    }
  }

  reset() {
    this.setState({success: false})
    document.querySelector("#abort_button").disabled = true;
    this.init()
  }

  abort() {
    const { t } = this.props;
    axios({
      method: 'post',
      url: `/backend/abort?id=${this.state.id}`
    })
      .then(res => {
        document.querySelector("#response_field").innerHTML = t('upload.abort.success').replace('{id}', this.state.id);
        // disable abort button
        document.querySelector("#abort_button").disabled = true;
      })
      .catch((error) => {
        document.querySelector("#response_field").innerHTML = t('upload.abort.error').replace('{id}', this.state.id);
      })
  }

  GetJobPosition() {
    const { t } = this.props;
    const that = this
    // sfm job
    if (this.state.SFMisLoading == true) {
      axios({
        method: 'get',
        url: `/backend/jobposition?id=${this.state.id}`
      })
        .then(res => {
          console.log("SFM Job position: ", res.data)
          if (res.data=="finished") {
            // job is finished
            that.setState({SFMisLoading: false, MESHisLoading: true, currentPipeState: 'Mesh', currentSFMJobPosition: res.data})
          } else {
            // job is still loading, res.data will either be "processing" or the jobposition
            if (res.data=="processing") {
              that.setState({SFMisLoading: true, currentPipeState: 'SFM', currentSFMJobPosition: res.data, status: "Status"}) // res.data can be the job position or str "processing"
            } else {
              that.setState({SFMisLoading: true, currentPipeState: 'SFM', currentSFMJobPosition: res.data, status: "Queued"})
            }
            
          }
        })
        .catch((error) => {
          console.log("[Error] SFM Job: ", error.response.data)
          that.setState({currentSFMJobPosition: -1}) 
        })
    }

    // mesh reconstruction job
    if (this.state.MESHisLoading == true) {
      axios({
        method: 'get',
        url: `/backend/jobposition?id=${this.state.mesh_job_id}`
      })
        .then(res => {
          console.log("Mesh Job position: ", res)
          if (res.data=="finished") {
            // job is finished
            that.setState({MESHisLoading: false, currentMeshJobPosition: res.data})
          } else {
            if (res.data=="processing") {
              console.log("Current Pipe state: ", this.state.currentPipeState)
              that.setState({MESHisLoading: true, currentPipeState: 'Mesh', currentMeshJobPosition: res.data, status: "Status"}) 
            } else {
              console.log("Current Pipe state: ", this.state.currentPipeState)
              that.setState({MESHisLoading: true, currentPipeState: 'Mesh', currentMeshJobPosition: res.data, status: "Queued"})
            }
            
          }
        })
        .catch((error) => {
          console.log("[Error] Mesh Job: ", error.response.data)
          that.setState({currentMeshJobPosition: -1}) 
        })
    }
  }

  resetDropbox() {
    this.dropzone.removeAllFiles(true); 
  }

  /**
   * Update job status every few seconds
   */
  startJobStatusRequest = () => {
    // initialize with SFMisLoading = true
    const { t } = this.props;
    const that = this
    that.setState({SFMisLoading: true})
    this.refreshTimer = setInterval(() => {
      if (this.state.SFMisLoading || this.state.MESHisLoading) {
        console.log("Refreshing job status...");
        this.GetJobPosition()
      } else {
        console.log("Job finished, stopping refresh.");
        clearInterval(this.refreshTimer);
      }
    }, 5000);
  };

  render() {
    const { t } = this.props;
    //this.state.isLoading = true;
    //if (this.state.isLoading == true) {
    //  return <LoadingScreen jobPosition={this.state.currentJobPosition}></LoadingScreen>
    //}
    return (
      <div>
        <BrowserView>
          <div className='content'>
            <div className='wrapper_centered_box'>
            {this.state.MESHisLoading && 
              <LoadingScreen currentPipeState={this.state.currentPipeState} jobPosition={this.state.currentMeshJobPosition} isLoading={this.state.MESHisLoading} status={this.state.status}/>
            }
            {this.state.SFMisLoading && 
              <LoadingScreen currentPipeState={this.state.currentPipeState} jobPosition={this.state.currentSFMJobPosition} isLoading={this.state.SFMisLoading} status={this.state.status}/>
            }
            
            {!this.state.success &&
              <div>
                <img src='images.png' className='images'/>
                <img src='mesh.png' className='mesh'/>
                <i className="arrow first"></i>
                <i className="arrow second"></i>
                <i className="arrow third"></i>
                <i className="arrow fourth"></i>
                <form className="dropzone" method="POST" action="/backend/" id="upload">
                </form>
                <small className="hint">{t('upload.files.support')} JPG, JPEG, PNG</small><br />
                <div className="edit_buttons">
                  <button id="submit_upload" className="button_small">{t('upload.submit')}</button>
                  <button onClick={() => {this.resetDropbox()}} className="button_small">{t('upload.reset')}</button>
                </div>
                {/*<br />
                <hr></hr>
                <div className="formfield">
                <input type="checkbox" id="ply" name="ply"></input>
                <label for="ply" className="formfield">{t('upload.pc.label')}</label>
                <small className="hint"><br></br>{t('upload.pc.hint')}</small>
                </div>*/}
                {/*<hr></hr>
                <div className="formfield">
                <label for="email" className="formfield">Email </label>
                <input type="email" id="email" name="email" className="formfield_input"></input>
                <small className="hint"><br></br>{t('upload.email')}<br></br></small>
                </div>*/}
              </div>
            }
            {this.state.success &&
              <div>
                <img src='images.png' className='images'/>
                <img src='mesh.png' className='mesh'/>
                <i className="arrow first"></i>
                <i className="arrow second"></i>
                <i className="arrow third"></i>
                <i className="arrow fourth"></i>
                <h2>SUCCESS
                </h2>
                <hr></hr>
                <p id="response_field">
                </p>
                <hr></hr>
                <div className="edit_buttons">
                  <button onClick={() => {this.reset()}} className="button_small">{t('upload.new')}</button><br />
                  <button id="abort_button" onClick={() => {this.abort()}} className="button_small">{t('upload.abort.button')}</button><br />
                </div>
              </div>
            }
            </div>
          </div>
        </BrowserView>
        <MobileView>
        <div>
            <div className='mobile_wrapper_upload'>
            {this.state.MESHisLoading && 
              <LoadingScreen currentPipeState={this.state.currentPipeState} jobPosition={this.state.currentMeshJobPosition} isLoading={this.state.MESHisLoading} status={this.state.status}/>
            }
            {this.state.SFMisLoading && 
              <LoadingScreen currentPipeState={this.state.currentPipeState} jobPosition={this.state.currentSFMJobPosition} isLoading={this.state.SFMisLoading} status={this.state.status}/>
            }
            
            {!this.state.success &&
              <div>
                <img src='images.png' className='images'/>
                <img src='mesh.png' className='mesh'/>
                <i className="arrow first"></i>
                <i className="arrow second"></i>
                <i className="arrow third"></i>
                <i className="arrow fourth"></i>
                <form className="dropzone" method="POST" action="/backend/" id="upload">
                </form>
                <small className="hint">{t('upload.files.support')} JPG, JPEG, PNG</small><br />
                <div className="edit_buttons">
                  <button id="submit_upload" className="button_small">{t('upload.submit')}</button>
                  <button onClick={() => {this.resetDropbox()}} className="button_small">{t('upload.reset')}</button>
                </div>
                {/*<br />
                <hr></hr>
                <div className="formfield">
                <input type="checkbox" id="ply" name="ply"></input>
                <label for="ply" className="formfield">{t('upload.pc.label')}</label>
                <small className="hint"><br></br>{t('upload.pc.hint')}</small>
                </div>
                <hr></hr>
                <div className="formfield">
                <label for="email" className="formfield">Email </label>
                <input type="email" id="email" name="email" className="formfield_input"></input>
                <small className="hint"><br></br>{t('upload.email')}<br></br></small>
                </div>*/}
              </div>
            }
            {this.state.success &&
              <div>
                <h2>SUCCESS
                </h2>
                <hr></hr>
                <p id="response_field">
                </p>
                <hr></hr>
                <div className="edit_buttons">
                  <button onClick={() => {this.reset()}} className="button_small">{t('upload.new')}</button><br />
                  <button id="abort_button" onClick={() => {this.abort()}} className="button_small">{t('upload.abort')}</button><br />
                </div>
              </div>
            }
            </div>
          </div>
        </MobileView>
      </div>
    )
  }
}

export default withTranslation()(Upload);