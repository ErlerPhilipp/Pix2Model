import 'dropzone/dist/dropzone.css'
import './UploadComponent.css';
import React, { Component } from 'react';
import Dropzone from 'dropzone'
import { BrowserView, MobileView } from 'react-device-detect';

import { withTranslation } from 'react-i18next';

class Upload extends Component {

  constructor(props){
    super(props);
    Dropzone.autoDiscover = false;
    this.state = {
      success: false
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
      that.dropzone = new Dropzone(uploader, dropzoneOptions);
      const submitButton = document.querySelector("#submit_upload");
      submitButton.addEventListener("click", eventArgs => {
          document.querySelector("#upload").dropzone.processQueue();
      });
      document.querySelector("#upload").dropzone.on("sending", function(file, xhr, data) {
          if (data) {
            data.append("user_email", document.querySelector("#email").value);
            data.append("step2", + !document.querySelector("#ply").checked);
          }
      });
      document.querySelector("#upload").dropzone.on("success", (file, response) => {
          that.setState({success: true})
          submitButton.disablwrapper_uploaded = true;
          document.querySelector("#response_field").innerHTML = `${t('upload.success')}<a href="${window.location.href}?id=${response.replace('data/','')}&page=1">${window.location.href}?id=${response.replace('data/','')}&page=1</a>`;
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
    this.init()
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
                <button onClick={() => {this.reset()}} class="button_small">{t('upload.new')}</button><br />
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
                <button onClick={() => {this.reset()}} class="button_small">{t('upload.new')}</button><br />
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