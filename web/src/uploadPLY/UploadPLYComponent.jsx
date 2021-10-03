import 'dropzone/dist/dropzone.css'
import '../upload/UploadComponent.css';
import React, { Component } from 'react';
import Dropzone from 'dropzone'

import { withTranslation } from 'react-i18next';

class UploadPLY extends Component {
  constructor(props){
    super(props);
    Dropzone.autoDiscover = false;
  
    document.addEventListener("DOMContentLoaded", () => {
      const submitButton = document.querySelector("#submit_upload_ply");
      submitButton.addEventListener("click", eventArgs => {
          document.querySelector("#upload_ply").dropzone.processQueue();
      });
  
      document.querySelector("#upload_ply").dropzone.on("success", (file, response) => {
          submitButton.disablwrapper_uploaded = true;
          document.querySelector("#response_field_ply").innerHTML = `Upload successful!\nJob created with id:<br/><a href="/result?id=${response}">${response}</a>`;
      });
    });
  }

  componentDidMount() {
    const { t } = this.props;
    var dropzoneOptions = {
      paramName: "file",
      autoProcessQueue: false,
      uploadMultiple: true,
      parallelUploads: 100,
      maxFilesize: 50,
      maxFiles: 100,
      acceptedFiles: ".ply",
      dictDefaultMessage: "Drop files here to upload<br/><small>Max 100 files, 10MB per file</small>"
    };
    var uploader = document.querySelector('#upload_ply');
    var newDropzone = new Dropzone(uploader, dropzoneOptions);
  }

  render() {
    const { t } = this.props;
    return (
      <div class='content'>
        <div class='wrapper_centered_box'>
          <img src='ply.png' class='ply'/>
          <img src='mesh.png' class='mesh'/>
          <i class="arrow first"></i>
          <i class="arrow second"></i>
          <i class="arrow third"></i>
          <i class="arrow fourth"></i>
          <form class="dropzone" method="POST" action="http://127.0.0.1/backend/" id="upload_ply">
          </form>
          <small class="hint">{t('upload.files.support')} PLY</small><br /><br /><br />
          <button id="submit_upload_ply" class="button_small">{t('upload.submit')}</button><br />
          <small id="response_field_ply">
          </small>
          <hr></hr>
          <div class="formfield">
          <label for="email_ply" class="formfield">Email <big><sup>*</sup></big></label>
          <input type="email" id="email_ply" name="email" class="formfield_input"></input>
          <small class="hint"><br></br>{t('upload.email')}<br></br></small>
          </div>
        </div>
      </div>
    )
  }
}

export default withTranslation()(UploadPLY);