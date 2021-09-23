import React, { Component } from 'react'
import * as THREE from "three";
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import Attribute from "./AttributeComponent";
import { Loader } from './Loader.js';
import { withTranslation } from 'react-i18next';
import { CSG } from 'three-csg-ts';

import './EditComponent.css';

class Edit extends Component {
  constructor(props) {
    super(props);
    this.scene = new THREE.Scene();
    this.state = {crop: false, loaded: false, name: '', rotation: {x: 0, y: 0, z: 0}, translation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}};
  }

  componentDidMount() {
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 300, window.innerHeight - 75);
    this.scene.background = new THREE.Color(0xfbebc3);
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
        case "q":
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
    window.addEventListener('resize', function() {
      renderer.setSize(window.innerWidth - 300, window.innerHeight - 75);
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
      if (event.dataTransfer.items) {
        scope.loader.loadItemList(event.dataTransfer.items);
      } else {
        scope.loader.loadFiles(event.dataTransfer.files);
      }
    }, false);
    this.buildFileSelector();
    this.createCropBox();
  }

  buildFileSelector(){
    this.fileSelector = document.createElement('input');
    this.fileSelector.setAttribute('type', 'file');
    this.handleUpload_ = this.handleUpload.bind(this);
    this.fileSelector.addEventListener('change', this.handleUpload_, false);
  }

  handleFileSelect = (e) => {
    e.preventDefault();
    this.fileSelector.click();
  }

  handleUpload = (event) => {
    this.loader.loadFiles(this.fileSelector.files);
  }

  addObject(object, filename) {
    if (object.type == 'Group') {
      this.object = object.children[0];
    } else {
      this.object = object;
    }
    console.log(this.object)
    this.scene.add(this.object);
    this.transformControls.attach(this.object);
    this.setState({loaded: true, name: filename});
  }

  createCropBox() {
    var geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.5,
      transparent: true
    });
    this.cropBox = new THREE.Mesh( geometry, material );
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

  handleDownload() {
    var exporter = new PLYExporter();
    var link = document.createElement( 'a' );
    if ( link.href ) {
      URL.revokeObjectURL( link.href );
    }
    link.href = URL.createObjectURL( new Blob( [ exporter.parse( this.object ) ], { type: 'text/plain' } ) );
    link.download = "model.ply";
    link.dispatchEvent( new MouseEvent( 'click' ) );
  }

  cropObject() {
    if (!this.object) {
      return;
    }
   
    this.cropBox.updateMatrix();
    this.object.updateMatrix();
    if (!this.object.geometry.attributes.normal) {
      const normals = new Array(this.object.geometry.attributes.position.len).fill([0, 0, 0]);
      this.object.geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(normals), 3)
      );
    }
    console.log(this.object)
    const bspObject = CSG.fromMesh(this.object);
    const bspBox = CSG.fromMesh(this.cropBox);                        
    const bspResult = bspBox.inverse().intersect(bspObject.inverse());
    const croppedObject = CSG.toMesh(bspResult, this.object.matrix);
    croppedObject.material = this.object.material;
    this.scene.add(croppedObject);
    this.scene.remove(this.object);
    this.object = croppedObject;
  }

  updateValue(attribute, value) {
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

  handleRemove() {
    this.transformControls.detach(this.object);
    this.scene.remove(this.object);
    this.scene.remove(this.cropBox);
    this.setState({loaded: false, name: ''});
  }

  activateCrop(crop) {
    this.setState({crop: crop});
    if (crop) {
      this.scene.add(this.cropBox);
      this.transformControls.detach(this.object);
      this.transformControls.attach(this.cropBox);
    } else {
      this.transformControls.detach(this.cropBox);
      this.scene.remove(this.cropBox);
      this.transformControls.attach(this.object);
    }
  }

  render() {

    this._handleRemove = this.handleRemove.bind(this)
    this._handleDownload = this.handleDownload.bind(this)
    this._handleFileSelect = this.handleFileSelect.bind(this)
    const { t } = this.props;

    return (
      <div class='content' ref={ref => (this.mount = ref)}>
        <div class='edit_toolbar'>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"></link>
          {this.state.loaded &&
            <div class='edit_box'>
              <p>{ this.state.name }</p>
              <hr></hr>
              <p class="heading_interaction">TRANSFORMATIONS</p>
              <Attribute name='Scale' editor={this} x={ this.state.scale.x } y={this.state.scale.y} z={this.state.scale.z}></Attribute>
              <Attribute name='Rotation' editor={this} x={this.state.rotation.x} y={this.state.rotation.y} z={this.state.rotation.z}></Attribute>
              <Attribute name='Translation' editor={this} x={this.state.translation.x} y={this.state.translation.y} z={this.state.translation.z}></Attribute>
              <hr></hr>
              <p class="heading_interaction">CROP</p>
              <label class="container">Activate
                <input id="crop" type="checkbox" onClick={(event) => {
                  this.activateCrop(event.target.checked);
                }}/>
                <span class="checkmark"></span>
              </label>
              {this.state.crop &&
                <button onClick={() => {this.cropObject()}} class="crop_button">Crop</button>
              }
              {!this.state.crop &&
                <button class="crop_button" disabled>Crop</button>
              }
              <button onClick={this._handleDownload} class='edit_download'><i class="fa fa-download"></i></button>
              <button onClick={this._handleRemove} class='edit_remove'><i class="fa fa-remove"></i></button>
            </div>
          }
          {this._cropValue &&
            <button onClick={this._handleFileSelect} class='edit_upload' disabled><i class="fa fa-upload"></i></button>
          }
          {!this._cropValue &&
            <button onClick={this._handleFileSelect} class='edit_upload'><i class="fa fa-upload"></i></button>
          }
        </div>
        <div class='infobox'>
          {t('edit.interaction')}
        </div>
      </div>
    )
  }
}

export default withTranslation()(Edit);
