import 'dropzone/dist/dropzone.css'
import './UploadComponent.css';
import React, { Component } from 'react';
import Dropzone from 'dropzone'

class Upload extends Component {

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
      acceptedFiles: ".png, .jpg, .jpeg",
      dictDefaultMessage: "Drop files here to upload<br/><small>Max 100 files, 10MB per file</small>"
    };
    var uploader = document.querySelector('#upload');
    var newDropzone = new Dropzone(uploader, dropzoneOptions);
  }

  render() {
    return (
      <div class='wrapper_centered_box'>
        <img src='images3.png' class='images'/>
        <img src='mesh.png' class='mesh'/>
        <i class="arrow first"></i>
        <i class="arrow second"></i>
        <i class="arrow third"></i>
        <i class="arrow fourth"></i>
        <form class="dropzone" method="POST" action="http://0.0.0.0:5000/" id="upload">
        </form>
        <small class="hint">Supports JPG, JPEG, PNG</small><br />
        <button id="submit_upload" class="button_small">Submit files</button><br />
        <small id="response_field">
        </small>
        <hr></hr>
        <div class="formfield">
        <input type="checkbox" id="ply" name="ply"></input>
        <label for="ply" class="formfield">Convert to point cloud</label>
        <small class="hint"><br></br>Check the above box to increase processing time and quality.
        The images are converted to a point cloud instead of directly generating the reconstructed model.
        The point cloud can be edited and cleaned up in the Edit area and can then be uploaded again 
        under Ply-2-Mesh to generate the final reconstructed model.</small>
        </div>
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

export default Upload;