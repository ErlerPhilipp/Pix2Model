import 'dropzone/dist/dropzone.css'
import './UploadComponent.css';
import React, { Component } from 'react';
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
      id: ''
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
        parallelUploads: 100,
        maxFilesize: 50,
        maxFiles: 100,
        acceptedFiles: ".png, .jpg, .jpeg",
        dictDefaultMessage: "Drop files here to upload<br/><small>Max 100 files, 10MB per file</small>",
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
          document.querySelector("#upload").dropzone.processQueue();
          document.querySelector("#upload").dropzone.removeEventListeners();
      });
      document.querySelector("#upload").dropzone.on("sending", function(file, xhr, data) {
          if (data) {
            //data.append("user_email", document.querySelector("#email").value);
            data.append("step2", + !document.querySelector("#ply").checked);
          }
      });
      document.querySelector("#upload").dropzone.on("success", (file, response) => {
          document.querySelector("#upload").dropzone.setupEventListeners();
          that.setState({success: true, id: response.replace('data/','')})
          submitButton.disablwrapper_uploaded = true;
          var refresh = window.location.protocol + "//" + window.location.host + window.location.pathname + `?id=${response.replace('data/','')}`;    
          window.history.pushState({ path: refresh }, '', refresh);
          document.querySelector("#response_field").innerHTML = `${t('upload.success')}<a href="${window.location.protocol + "//" + window.location.host + window.location.pathname}?id=${response.replace('data/','')}&page=1">${window.location.protocol + "//" + window.location.host + window.location.pathname}?id=${response.replace('data/','')}&page=1</a>`;
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

  resetDropbox() {
    this.dropzone.removeAllFiles(true); 
  }

  render() {
    const { t } = this.props;
    return (
      <div>
        <BrowserView>
          <div class='content'>
            <div class='wrapper_centered_box'>
            {!this.state.success &&
              <div>
                <img src='images.png' class='images'/>
                <img src='mesh.png' class='mesh'/>
                <i class="arrow first"></i>
                <i class="arrow second"></i>
                <i class="arrow third"></i>
                <i class="arrow fourth"></i>
                <form class="dropzone" method="POST" action="/backend/" id="upload">
                </form>
                <small class="hint">{t('upload.files.support')} JPG, JPEG, PNG</small><br />
                <div class="edit_buttons">
                  <button id="submit_upload" class="button_small">{t('upload.submit')}</button>
                  <button onClick={() => {this.resetDropbox()}} class="button_small">{t('upload.reset')}</button>
                </div>
                <br />
                <hr></hr>
                <div class="formfield">
                <input type="checkbox" id="ply" name="ply"></input>
                <label for="ply" class="formfield">{t('upload.pc.label')}</label>
                <small class="hint"><br></br>{t('upload.pc.hint')}</small>
                </div>
                {/*<hr></hr>
                <div class="formfield">
                <label for="email" class="formfield">Email </label>
                <input type="email" id="email" name="email" class="formfield_input"></input>
                <small class="hint"><br></br>{t('upload.email')}<br></br></small>
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
                <div class="edit_buttons">
                  <button onClick={() => {this.reset()}} class="button_small">{t('upload.new')}</button><br />
                  <button id="abort_button" onClick={() => {this.abort()}} class="button_small">{t('upload.abort.button')}</button><br />
                </div>
              </div>
            }
            </div>
          </div>
        </BrowserView>
        <MobileView>
        <div>
            <div class='mobile_wrapper_upload'>
            {!this.state.success &&
              <div>
                <img src='images.png' class='images'/>
                <img src='mesh.png' class='mesh'/>
                <i class="arrow first"></i>
                <i class="arrow second"></i>
                <i class="arrow third"></i>
                <i class="arrow fourth"></i>
                <form class="dropzone" method="POST" action="/backend/" id="upload">
                </form>
                <small class="hint">{t('upload.files.support')} JPG, JPEG, PNG</small><br />
                <div class="edit_buttons">
                  <button id="submit_upload" class="button_small">{t('upload.submit')}</button>
                  <button onClick={() => {this.resetDropbox()}} class="button_small">{t('upload.reset')}</button>
                </div>
                <br />
                <hr></hr>
                <div class="formfield">
                <input type="checkbox" id="ply" name="ply"></input>
                <label for="ply" class="formfield">{t('upload.pc.label')}</label>
                <small class="hint"><br></br>{t('upload.pc.hint')}</small>
                </div>
                <hr></hr>
                <div class="formfield">
                <label for="email" class="formfield">Email </label>
                <input type="email" id="email" name="email" class="formfield_input"></input>
                <small class="hint"><br></br>{t('upload.email')}<br></br></small>
                </div>
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
                <div class="edit_buttons">
                  <button onClick={() => {this.reset()}} class="button_small">{t('upload.new')}</button><br />
                  <button id="abort_button" onClick={() => {this.abort()}} class="button_small">{t('upload.abort')}</button><br />
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