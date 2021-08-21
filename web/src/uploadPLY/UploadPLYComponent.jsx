import 'dropzone/dist/dropzone.css'
import '../upload/UploadComponent.css';
import React, { Component } from 'react';
import Dropzone from 'dropzone'

class UploadPLY extends Component {
  constructor(props){
    super(props);
    Dropzone.autoDiscover = false;
  
    document.addEventListener("DOMContentLoaded", () => {
      const submitButton = document.querySelector("#submit_upload");
      submitButton.addEventListener("click", eventArgs => {
          document.querySelector("#upload").dropzone.processQueue();
      });
  
      document.querySelector("#upload").dropzone.on("success", (file, response) => {
          submitButton.disablwrapper_uploaded = true;
          document.querySelector("#response_field").innerHTML = `Upload successful!\nJob created with id:<br/><a href="/result?id=${response}">${response}</a>`;
      });
    });
  }

  componentDidMount() {
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
    var uploader = document.querySelector('#upload');
    var newDropzone = new Dropzone(uploader, dropzoneOptions);
  }

  render() {
    return (
      <div class='wrapper_centered_box'>
        <img src='ply.png' class='ply'/>
        <img src='mesh.png' class='mesh'/>
        <i class="arrow first"></i>
        <i class="arrow second"></i>
        <i class="arrow third"></i>
        <i class="arrow fourth"></i>
        <form class="dropzone" method="POST" action="http://0.0.0.0:5000/" id="upload">
        </form>
        <small class="hint">Supports PLY</small><br />
        <button id="submit_upload" class="button_small">Submit files</button><br />
        <small id="response_field">
        </small>
        <hr></hr>
        <div class="formfield">
        <label for="email" class="formfield">Enter your email <big><sup>*</sup></big></label>
        <input type="email" id="email" name="email" class="formfield_input"></input>
        <small class="hint">[Optional] Notification email when convertion is done<br></br></small>
        </div>
      </div>
    )
  }
}

export default UploadPLY;