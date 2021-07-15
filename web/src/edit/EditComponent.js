import React, { Component } from 'react'
import * as THREE from "three";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import Attribute from "./AttributeComponent";
import { Loader } from './Loader.js';

import './EditComponent.css';

function buildFileSelector(){
  const fileSelector = document.createElement('input');
  fileSelector.setAttribute('type', 'file');
  fileSelector.setAttribute('multiple', 'multiple');
  return fileSelector;
}

class Edit extends Component {
  constructor(props) {
    super(props);
    this.scene = new THREE.Scene();
    this.state = {loaded: false, name: '', rotation: {x: 0, y: 0, z: 0}, translation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}};
  }

  addObject(object, filename) {
    this.scene.add(object);
    this.transformControls.attach(object);
    this.object = object;
    this.setState({loaded: true, name: filename});
  }

  handleUpdate() {
    if (!this.object) {
      return;
    }
    var rotation = {x: this.object.rotation.x * 180 / Math.PI, y: this.object.rotation.y * 180 / Math.PI, z: this.object.rotation.z * 180 / Math.PI};
    var scale = {x: this.object.scale.x, y: this.object.scale.y, z: this.object.scale.z};
    var translation = {x: this.object.position.x, y: this.object.position.y, z: this.object.position.z};
    this.setState({rotation, scale, translation});
  }

  updateValue(attribute, value) {
    if (isNaN(parseFloat(value))) {
      parseFloat(value)
    }
    if (attribute === 'ScaleX') {
      this.object.scale.x = parseFloat(value)
    } else if (attribute === 'ScaleY') {
      this.object.scale.y = parseFloat(value)
    } else if (attribute === 'ScaleZ') {
      this.object.scale.z = parseFloat(value)
    } else if (attribute === 'TranslationX') {
      this.object.position.x = parseFloat(value)
    } else if (attribute === 'TranslationY') {
      this.object.position.y = parseFloat(value)
    } else if (attribute === 'TranslationZ') {
      this.object.position.z = parseFloat(value)
    } else if (attribute === 'RotationX') {
      this.object.rotation.x = parseFloat(value) * Math.PI / 180
    } else if (attribute === 'RotationY') {
      this.object.rotation.y = parseFloat(value) * Math.PI / 180
    } else if (attribute === 'RotationZ') {
      this.object.rotation.z = parseFloat(value) * Math.PI / 180
    }
    this.handleUpdate();
  }
  

  componentDidMount() {
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 50);
    this.scene.background = new THREE.Color(0xFEFFE8);
    const light = new THREE.AmbientLight(0x404040); // soft white light
    this.scene.add(light);
    this.mount.appendChild(renderer.domElement);
    camera.position.z = 5;
    const controls = new OrbitControls(camera, renderer.domElement);
    this.transformControls = new TransformControls(camera, renderer.domElement);
    this.loader = new Loader(this);
    var scope = this;
    this.transformControls.addEventListener('mouseDown', function () {
      controls.enabled = false;
    });
    this.transformControls.addEventListener('mouseUp', function () {
      controls.enabled = true;
    });
    // transformcontrols
    this._handleUpdate = this.handleUpdate.bind(this)
    this.transformControls.addEventListener('change', this._handleUpdate);
    this.scene.add(this.transformControls);
    window.addEventListener('keydown', function (event) {
      switch (event.key) {
        case "g":
          scope.transformControls.setMode("translate")
          break
        case "r":
          scope.transformControls.setMode("rotate")
          break
        case "s":
          scope.transformControls.setMode("scale")
          break
      }
    })
    // animation
    var animate = function () {
      requestAnimationFrame(animate);
      renderer.render(scope.scene, camera);
      controls.update();
    };
    animate();
    // loader
    document.addEventListener('dragover', function (event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }, false);
    document.addEventListener('drop', function (event) {
      event.preventDefault();
      if (event.dataTransfer.types[0] === 'text/plain') return; // Outliner drop
      console.log(event.dataTransfer.items);
      if (event.dataTransfer.items) {
        scope.loader.loadItemList(event.dataTransfer.items);
      } else {
        scope.loader.loadFiles(event.dataTransfer.files);
      }
    }, false);
    this.fileSelector = buildFileSelector();
    this.fileSelector.addEventListener('change', this.handleUpload, false);

  }

  handleFileSelect = (e) => {
    e.preventDefault();
    this.fileSelector.click();
  }

  handleUpload = (event) => {
    console.log(event);
    if (event.dataTransfer.types[0] === 'text/plain') return; // Outliner drop
    if (event.dataTransfer.items) {
      this.loader.loadItemList(event.dataTransfer.items);
    } else {
      this.loader.loadFiles(event.dataTransfer.files);
    }
  }

  render() {

    const loader_ = new OBJLoader();
    var scope = this;

    function handleRemove() {
      scope.transformControls.detach(scope.object);
      scope.scene.remove(scope.object);
      scope.setState({loaded: false, name: ''});
    }

    return (
      <div ref={ref => (this.mount = ref)}>
        <div class='edit_toolbar'>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"></link>
          {this.state.loaded &&
            <div class='edit_box'>
              <p>{ this.state.name }</p>
              <hr></hr>
              <Attribute name='Scale' editor={this} x={ this.state.scale.x } y={this.state.scale.y} z={this.state.scale.z}></Attribute>
              <Attribute name='Rotation' editor={this} x={this.state.rotation.x} y={this.state.rotation.y} z={this.state.rotation.z}></Attribute>
              <Attribute name='Translation' editor={this} x={this.state.translation.x} y={this.state.translation.y} z={this.state.translation.z}></Attribute>
              <button onClick={handleRemove} class='edit_download'><i class="fa fa-download"></i></button>
              <button onClick={handleRemove} class='edit_remove'><i class="fa fa-remove"></i></button>
            </div>
          }
          <button onClick={this.handleFileSelect} class='edit_upload'><i class="fa fa-upload"></i></button>
        </div>
      </div>
    )
  }
}

export default Edit;
