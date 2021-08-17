import 'dropzone/dist/dropzone.css'
import React, { Component } from 'react';
import Dropzone from 'dropzone'

function Download() {

  return (
    <div class='wrapper_centered_box'>
      <label for="id" class="formfield">Download ID</label>
      <input id="id" name="id" class="formfield_input"></input>
      <img src='download.svg' class='icon'></img>
    </div>
  )
}

export default Download;